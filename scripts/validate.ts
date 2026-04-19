import * as fs from 'fs';

interface OrderInfo {
  id: number;
  type: string;
  pickups: { botId: number; time: number }[];
  completed?: number;
}

interface BotInfo {
  id: number;
  destroyed?: boolean;
}

interface Event {
  line: number;
  time: number;
  body: string;
}

function parseTime(ts: string): number {
  const m = ts.match(/(\d{2}):(\d{2}):(\d{2})/);
  if (!m) return 0;
  return (parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3])) * 1000;
}

function parseEvents(content: string): Event[] {
  const events: Event[] = [];
  let lineNum = 0;
  for (const line of content.split('\n')) {
    lineNum++;
    const m = line.match(/^\[(\d{2}:\d{2}:\d{2})\]\s*(.*)/);
    if (!m) continue;
    events.push({ line: lineNum, time: parseTime(m[1]), body: m[2].trim() });
  }
  return events;
}

// --- Validators ---

function validateOrderIdIncreasing(events: Event[], _orders: Map<number, OrderInfo>): string[] {
  const errors: string[] = [];
  let lastId = 0;
  for (const e of events) {
    const m = e.body.match(/^Created (NORMAL|VIP) Order #(\d+)/);
    if (!m) continue;
    const id = parseInt(m[2]);
    if (id <= lastId) errors.push(`L${e.line}: Order #${id} not increasing (prev ${lastId})`);
    lastId = id;
  }
  return errors;
}

function validateBotIdIncreasing(events: Event[], _orders: Map<number, OrderInfo>): string[] {
  const errors: string[] = [];
  let lastId = 0;
  for (const e of events) {
    const m = e.body.match(/^Bot #(\d+) created/);
    if (!m) continue;
    const id = parseInt(m[1]);
    if (id <= lastId) errors.push(`L${e.line}: Bot #${id} not increasing (prev ${lastId})`);
    lastId = id;
  }
  return errors;
}

function validatePickupExists(events: Event[], _orders: Map<number, OrderInfo>): string[] {
  const errors: string[] = [];
  const orders = new Map<number, boolean>();
  for (const e of events) {
    const created = e.body.match(/^Created (NORMAL|VIP) Order #(\d+)/);
    if (created) { orders.set(parseInt(created[2]), false); continue; }
    const pickup = e.body.match(/^Bot #(\d+) picked up (NORMAL|VIP) Order #(\d+)/);
    if (pickup) {
      const id = parseInt(pickup[3]);
      if (!orders.has(id)) errors.push(`L${e.line}: Pickup of unknown Order #${id}`);
      if (orders.get(id)) errors.push(`L${e.line}: Order #${id} picked up after already picked (no complete/return between)`);
      continue;
    }
    const completed = e.body.match(/^Bot #(\d+) completed (NORMAL|VIP) Order #(\d+)/);
    if (completed) {
      const id = parseInt(completed[3]);
      if (!orders.has(id)) errors.push(`L${e.line}: Completed unknown Order #${id}`);
      if (orders.get(id)) errors.push(`L${e.line}: Order #${id} completed without pickup`);
      orders.set(id, false);
      continue;
    }
    const destroyed = e.body.match(/^Bot #(\d+) destroyed while processing Order #(\d+)/);
    if (destroyed) {
      const id = parseInt(destroyed[2]);
      orders.set(id, false); // returned to pending
      continue;
    }
  }
  return errors;
}

function validateNoDuplicateCompleted(events: Event[], _orders: Map<number, OrderInfo>): string[] {
  const errors: string[] = [];
  const completed = new Set<number>();
  for (const e of events) {
    const m = e.body.match(/^Bot #(\d+) completed (NORMAL|VIP) Order #(\d+)/);
    if (!m) continue;
    const id = parseInt(m[3]);
    if (completed.has(id)) errors.push(`L${e.line}: Order #${id} completed more than once`);
    completed.add(id);
  }
  return errors;
}

function validateProcessingTime(events: Event[], _orders: Map<number, OrderInfo>): string[] {
  const errors: string[] = [];
  const pickups = new Map<number, { botId: number; time: number }[]>();
  for (const e of events) {
    const pickup = e.body.match(/^Bot #(\d+) picked up (NORMAL|VIP) Order #(\d+)/);
    if (pickup) {
      const id = parseInt(pickup[3]);
      if (!pickups.has(id)) pickups.set(id, []);
      pickups.get(id)!.push({ botId: parseInt(pickup[1]), time: e.time });
      continue;
    }
    const destroyed = e.body.match(/^Bot #(\d+) destroyed while processing Order #(\d+)/);
    if (destroyed) {
      const list = pickups.get(parseInt(destroyed[2]));
      if (list) list.pop();
      continue;
    }
    const completed = e.body.match(/^Bot #(\d+) completed (NORMAL|VIP) Order #(\d+)/);
    if (completed) {
      const botId = parseInt(completed[1]);
      const orderId = parseInt(completed[3]);
      const list = pickups.get(orderId);
      if (!list) { errors.push(`L${e.line}: Order #${orderId} has no pickup records`); continue; }
      const pickup = [...list].reverse().find(p => p.botId === botId);
      if (!pickup) { errors.push(`L${e.line}: Order #${orderId} was not picked up by Bot #${botId}`); continue; }
      let elapsed = e.time - pickup.time;
      if (elapsed < 0) elapsed += 86400000;
      if (elapsed < 9000) errors.push(`L${e.line}: Order #${orderId} completed in ${elapsed}ms, too fast (< 9s)`);
      if (elapsed > 11000) errors.push(`L${e.line}: Order #${orderId} completed in ${elapsed}ms, too slow (> 11s)`);
    }
  }
  return errors;
}

function validateBotExclusive(events: Event[], _orders: Map<number, OrderInfo>): string[] {
  const errors: string[] = [];
  const botOrder = new Map<number, number | null>(); // null = idle
  for (const e of events) {
    const created = e.body.match(/^Bot #(\d+) created/);
    if (created) { botOrder.set(parseInt(created[1]), null); continue; }
    const pickup = e.body.match(/^Bot #(\d+) picked up (NORMAL|VIP) Order #(\d+)/);
    if (pickup) {
      const botId = parseInt(pickup[1]);
      const cur = botOrder.get(botId);
      if (cur !== null && cur !== undefined) errors.push(`L${e.line}: Bot #${botId} picked up Order #${pickup[3]} while still on Order #${cur}`);
      botOrder.set(botId, parseInt(pickup[3]));
      continue;
    }
    const completed = e.body.match(/^Bot #(\d+) completed/);
    if (completed) { botOrder.set(parseInt(completed[1]), null); continue; }
    const idle = e.body.match(/^Bot #(\d+) is now IDLE/);
    if (idle) {
      const botId = parseInt(idle[1]);
      if (botOrder.get(botId) !== null) errors.push(`L${e.line}: Bot #${botId} IDLE but tracking shows it has an order`);
      continue;
    }
    const destroyed = e.body.match(/^Bot #(\d+) destroyed while processing Order #(\d+)/);
    if (destroyed) { botOrder.set(parseInt(destroyed[1]), null); continue; }
    const destroyedIdle = e.body.match(/^Bot #(\d+) destroyed while IDLE/);
    if (destroyedIdle) {
      const botId = parseInt(destroyedIdle[1]);
      if (botOrder.get(botId) !== null && botOrder.get(botId) !== undefined) {
        errors.push(`L${e.line}: Bot #${botId} destroyed IDLE but was processing an order`);
      }
      continue;
    }
  }
  return errors;
}

function validateVipPriority(events: Event[], _orders: Map<number, OrderInfo>): string[] {
  const errors: string[] = [];
  // After each pickup, the remaining pending orders should have all VIPs before normals.
  // Build a set of completed orders and track pending.
  const orderTypes = new Map<number, string>();
  const completed = new Set<number>();
  const processing = new Set<number>();

  for (const e of events) {
    const created = e.body.match(/^Created (NORMAL|VIP) Order #(\d+)/);
    if (created) { orderTypes.set(parseInt(created[2]), created[1].toLowerCase()); continue; }
    const pickup = e.body.match(/^Bot #(\d+) picked up (NORMAL|VIP) Order #(\d+)/);
    if (pickup) {
      const orderId = parseInt(pickup[3]);
      processing.add(orderId);
      // Check: are there any VIP orders still pending (not completed, not processing)?
      // The pickup should be VIP if any VIP is pending.
      const pickedType = orderTypes.get(orderId);
      if (pickedType === 'normal') {
        for (const [id, type] of orderTypes) {
          if (type === 'vip' && !completed.has(id) && !processing.has(id)) {
            errors.push(`L${e.line}: Normal Order #${orderId} picked up while VIP Order #${id} is pending`);
            break; // one error per wrong pickup
          }
        }
      }
      continue;
    }
    const done = e.body.match(/^Bot #(\d+) completed (NORMAL|VIP) Order #(\d+)/);
    if (done) { const id = parseInt(done[3]); processing.delete(id); completed.add(id); continue; }
    const destroyed = e.body.match(/^Bot #(\d+) destroyed while processing Order #(\d+)/);
    if (destroyed) { processing.delete(parseInt(destroyed[2])); continue; }
  }
  return errors;
}

function validateBotPostCompletion(events: Event[], _orders: Map<number, OrderInfo>): string[] {
  const errors: string[] = [];
  const pending = new Set<number>();
  const processing = new Map<number, number>(); // orderId -> botId

  for (let i = 0; i < events.length; i++) {
    const e = events[i];

    const created = e.body.match(/^Created (NORMAL|VIP) Order #(\d+)/);
    if (created) { pending.add(parseInt(created[2])); continue; }

    const pickup = e.body.match(/^Bot #(\d+) picked up (NORMAL|VIP) Order #(\d+)/);
    if (pickup) {
      const orderId = parseInt(pickup[3]);
      pending.delete(orderId);
      processing.set(orderId, parseInt(pickup[1]));
      continue;
    }

    const completed = e.body.match(/^Bot #(\d+) completed (NORMAL|VIP) Order #(\d+)/);
    if (completed) {
      const botId = parseInt(completed[1]);
      const orderId = parseInt(completed[3]);
      processing.delete(orderId);

      // Check next same-timestamp event for this bot
      const next = i + 1 < events.length ? events[i + 1] : null;
      const hasNextEvent = next && next.time === e.time && next.body.includes(`Bot #${botId}`);
      if (pending.size > 0) {
        if (!hasNextEvent || !next!.body.match(new RegExp(`^Bot #${botId} picked up`))) {
          errors.push(`L${e.line}: Bot #${botId} completed but has pending orders (${pending.size}) and did not pick up next`);
        }
      } else {
        if (!hasNextEvent || !next!.body.match(new RegExp(`^Bot #${botId} is now IDLE`))) {
          errors.push(`L${e.line}: Bot #${botId} completed with no pending orders but did not go IDLE`);
        }
      }
      continue;
    }

    const destroyed = e.body.match(/^Bot #(\d+) destroyed while processing Order #(\d+)/);
    if (destroyed) {
      const orderId = parseInt(destroyed[2]);
      processing.delete(orderId);
      pending.add(orderId);
      continue;
    }
  }
  return errors;
}

function validateDestroyConsistency(events: Event[], _orders: Map<number, OrderInfo>): string[] {
  const errors: string[] = [];
  // "destroyed while processing" must have the order actually being processed by that bot
  const botCurrentOrder = new Map<number, number>();
  for (const e of events) {
    const pickup = e.body.match(/^Bot #(\d+) picked up (NORMAL|VIP) Order #(\d+)/);
    if (pickup) { botCurrentOrder.set(parseInt(pickup[1]), parseInt(pickup[3])); continue; }
    const completed = e.body.match(/^Bot #(\d+) completed/);
    if (completed) { botCurrentOrder.delete(parseInt(completed[1])); continue; }
    const destroyedProcessing = e.body.match(/^Bot #(\d+) destroyed while processing Order #(\d+)/);
    if (destroyedProcessing) {
      const botId = parseInt(destroyedProcessing[1]);
      const orderId = parseInt(destroyedProcessing[2]);
      const current = botCurrentOrder.get(botId);
      if (current !== orderId) {
        errors.push(`L${e.line}: Bot #${botId} destroyed with Order #${orderId} but was processing Order #${current}`);
      }
      botCurrentOrder.delete(botId);
      continue;
    }
    const destroyedIdle = e.body.match(/^Bot #(\d+) destroyed while IDLE/);
    if (destroyedIdle) {
      const botId = parseInt(destroyedIdle[1]);
      const current = botCurrentOrder.get(botId);
      if (current !== undefined && current !== null) {
        errors.push(`L${e.line}: Bot #${botId} destroyed IDLE but tracking says Order #${current}`);
      }
      botCurrentOrder.delete(botId);
      continue;
    }
  }
  return errors;
}

function validateSummary(content: string, events: Event[]): string[] {
  const errors: string[] = [];
  const orderTypes = new Map<number, string>();
  const completedOrders = new Set<number>();
  const botCreated = new Set<number>();
  const botDestroyed = new Set<number>();

  for (const e of events) {
    const m1 = e.body.match(/^Created (NORMAL|VIP) Order #(\d+)/);
    if (m1) { orderTypes.set(parseInt(m1[2]), m1[1].toLowerCase()); continue; }
    const m2 = e.body.match(/^Bot #(\d+) completed.*Order #(\d+)/);
    if (m2) { completedOrders.add(parseInt(m2[2])); continue; }
    const m3 = e.body.match(/^Bot #(\d+) created/);
    if (m3) { botCreated.add(parseInt(m3[1])); continue; }
    const m4 = e.body.match(/^Bot #(\d+) destroyed/);
    if (m4) { botDestroyed.add(parseInt(m4[1])); continue; }
  }

  const totalMatch = content.match(/Total Orders: (\d+)/);
  const completedMatch = content.match(/Orders Completed: (\d+) \((\d+) VIP, (\d+) Normal\)/);
  const activeMatch = content.match(/Active Bots: (\d+)/);
  const pendingMatch = content.match(/Pending Orders: (\d+)/);

  if (totalMatch) {
    const total = parseInt(totalMatch[1]);
    if (total !== orderTypes.size) errors.push(`Summary: total ${total} != ${orderTypes.size}`);
  }
  if (completedMatch) {
    const completed = parseInt(completedMatch[1]);
    const vip = parseInt(completedMatch[2]);
    const normal = parseInt(completedMatch[3]);
    if (completed !== completedOrders.size) errors.push(`Summary: completed ${completed} != ${completedOrders.size}`);
    const actualVip = [...completedOrders].filter(id => orderTypes.get(id) === 'vip').length;
    const actualNormal = [...completedOrders].filter(id => orderTypes.get(id) === 'normal').length;
    if (vip !== actualVip) errors.push(`Summary: VIP ${vip} != ${actualVip}`);
    if (normal !== actualNormal) errors.push(`Summary: Normal ${normal} != ${actualNormal}`);
  }
  if (activeMatch) {
    const active = parseInt(activeMatch[1]);
    const actual = botCreated.size - botDestroyed.size;
    if (active !== actual) errors.push(`Summary: active bots ${active} != ${actual}`);
  }
  if (pendingMatch) {
    const pending = parseInt(pendingMatch[1]);
    const processing = events.filter(e => /^Bot #(\d+) picked up/.test(e.body)).length
      - events.filter(e => /^Bot #(\d+) completed/.test(e.body)).length
      - events.filter(e => /^Bot #(\d+) destroyed while processing/.test(e.body)).length;
    const actual = orderTypes.size - completedOrders.size - processing;
    if (pending !== actual) errors.push(`Summary: pending ${pending} != ${actual}`);
  }
  return errors;
}

// --- Runner ---

const validators: { name: string; fn: (events: Event[], orders: Map<number, OrderInfo>) => string[] }[] = [
  { name: 'Order ID strictly increasing', fn: validateOrderIdIncreasing },
  { name: 'Bot ID strictly increasing', fn: validateBotIdIncreasing },
  { name: 'Pickup references valid order', fn: validatePickupExists },
  { name: 'No duplicate completion', fn: validateNoDuplicateCompleted },
  { name: 'Processing time ~10s (9-11s)', fn: validateProcessingTime },
  { name: 'Bot exclusive (one order at a time)', fn: validateBotExclusive },
  { name: 'VIP priority', fn: validateVipPriority },
  { name: 'Bot post-completion state', fn: validateBotPostCompletion },
  { name: 'Destroy consistency', fn: validateDestroyConsistency },
];

function main(): void {
  const args = process.argv.slice(2);
  const resultPath = args[0] ?? 'scripts/result.txt';

  console.log(`Validating ${resultPath}\n`);
  const content = fs.readFileSync(resultPath, 'utf-8');
  const events = parseEvents(content);
  const orders = new Map<number, OrderInfo>();

  let totalErrors = 0;
  let passCount = 0;

  for (const v of validators) {
    const errors = v.fn(events, orders);
    if (errors.length === 0) {
      console.log(`  PASS  ${v.name}`);
      passCount++;
    } else {
      console.log(`  FAIL  ${v.name} (${errors.length} error(s))`);
      for (const e of errors.slice(0, 5)) console.log(`         ${e}`);
      if (errors.length > 5) console.log(`         ... and ${errors.length - 5} more`);
      totalErrors += errors.length;
    }
  }

  // Summary validation
  const summaryErrors = validateSummary(content, events);
  if (summaryErrors.length === 0) {
    console.log(`  PASS  Summary accuracy`);
    passCount++;
  } else {
    console.log(`  FAIL  Summary accuracy (${summaryErrors.length} error(s))`);
    for (const e of summaryErrors) console.log(`         ${e}`);
    totalErrors += summaryErrors.length;
  }

  console.log(`\n${passCount}/${validators.length + 1} checks passed, ${totalErrors} total errors`);
  if (totalErrors > 0) process.exit(1);
  else console.log('ALL VALID');
}

main();
