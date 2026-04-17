import * as readline from 'readline';
import { OrderController } from './v1.js';
import type { Clock } from './v1.js';

function ts(clock: Clock): string {
  const d = new Date(clock.now());
  return d.toTimeString().slice(0, 8);
}

function log(clock: Clock, msg: string): void {
  console.log(`[${ts(clock)}] ${msg}`);
}

function setupEvents(ctrl: OrderController): void {
  const c = ctrl.clock;
  ctrl.onOrderCreated((order) => {
    log(c, `Created ${order.type.toUpperCase()} Order #${order.id} - Status: PENDING`);
  });

  ctrl.onOrderProcessing((order, bot) => {
    log(c, `Bot #${bot.id} picked up ${order.type.toUpperCase()} Order #${order.id} - Status: PROCESSING`);
  });

  ctrl.onOrderCompleted((order, bot) => {
    log(c, `Bot #${bot.id} completed ${order.type.toUpperCase()} Order #${order.id} - Status: COMPLETE (Processing time: 10s)`);
  });

  ctrl.onBotCreated((bot) => {
    log(c, `Bot #${bot.id} created - Status: ${bot.status}`);
  });

  ctrl.onBotDestroyed((bot) => {
    if (bot.currentOrder) {
      log(c, `Bot #${bot.id} destroyed while processing Order #${bot.currentOrder.id} - Order returned to PENDING`);
    } else {
      log(c, `Bot #${bot.id} destroyed while IDLE`);
    }
  });

  ctrl.onBotIdle((bot) => {
    log(c, `Bot #${bot.id} is now IDLE - No pending orders`);
  });
}

function printStatus(ctrl: OrderController): void {
  const c = ctrl.clock;
  const pending = ctrl.pendingOrders;
  const completed = ctrl.completedOrderList;
  const bots = ctrl.botList;
  log(c, `--- Status ---`);
  log(c, `Pending: [${pending.map(o => `#${o.id}(${o.type})`).join(', ')}]`);
  log(c, `Processing: [${bots.filter(b => b.status === 'ACTIVE').map(b => `Bot#${b.id}->Order#${b.currentOrder!.id}`).join(', ')}]`);
  log(c, `Complete: [${completed.map(o => `#${o.id}(${o.type})`).join(', ')}]`);
  log(c, `Bots: ${bots.length} (${bots.filter(b => b.status === 'IDLE').length} idle, ${bots.filter(b => b.status === 'ACTIVE').length} active)`);
}

function createSimClock() {
  const pending: { fn: () => void; at: number }[] = [];
  let now = Date.now();

  return {
    clock: {
      now: () => now,
      setTimeout(fn: () => void, ms: number) {
        const handle = { fn, at: now + ms };
        pending.push(handle);
        return handle;
      },
      clearTimeout(handle: unknown) {
        const idx = pending.indexOf(handle as typeof pending[number]);
        if (idx !== -1) pending.splice(idx, 1);
      },
    } satisfies Clock,
    advance(ms: number) {
      const end = now + ms;
      while (now < end) {
        now += Math.min(1000, end - now);
        for (let i = pending.length - 1; i >= 0; i--) {
          if (pending[i].at <= now) {
            pending.splice(i, 1)[0].fn();
          }
        }
      }
    },
  };
}

type CmdResult = 'continue' | 'exit';

function realSleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function execCmd(ctrl: OrderController, cmd: string, sleepFn?: (ms: number) => Promise<void>): Promise<CmdResult> {
  const c = cmd.trim().toLowerCase();
  const parts = c.split(/\s+/);
  const [action, arg] = parts;

  if (action === 'n' || c === 'order normal') {
    ctrl.addOrder('normal');
  } else if (action === 'v' || c === 'order vip') {
    ctrl.addOrder('vip');
  } else if (action === '+' || c === 'bot add') {
    ctrl.addBot();
  } else if (action === '-' || c === 'bot remove') {
    ctrl.removeNewestBot();
  } else if (action === 's' || c === 'status') {
    printStatus(ctrl);
  } else if (action === 'sleep' && sleepFn && arg) {
    await sleepFn(parseInt(arg, 10));
  } else if (action === 'q' || c === 'exit') {
    return 'exit';
  } else if (action === 'h' || c === 'help') {
    const c2 = ctrl.clock;
    log(c2, 'Commands:');
    log(c2, '  order normal (n)  - Create normal order');
    log(c2, '  order vip (v)     - Create VIP order');
    log(c2, '  bot add (+)       - Add a cooking bot');
    log(c2, '  bot remove (-)    - Remove newest bot');
    log(c2, '  status (s)        - Show current status');
    log(c2, '  exit (q)          - Exit');
    if (sleepFn) log(c2, '  sleep <ms>        - Wait (virtual or real time)');
  } else if (action) {
    log(ctrl.clock, `Unknown command: ${c}. Type 'help' for commands.`);
  }
  return 'continue';
}

function printSummary(ctrl: OrderController): void {
  const completed = ctrl.completedOrderList;
  const pending = ctrl.pendingOrders;
  const processing = ctrl.botList.filter(b => b.status === 'ACTIVE').length;
  const total = completed.length + pending.length + processing;
  const vipCount = completed.filter(o => o.type === 'vip').length;
  const normalCount = completed.filter(o => o.type === 'normal').length;
  console.log('');
  console.log('Final Status:');
  console.log(`- Total Orders: ${total}`);
  console.log(`- Orders Completed: ${completed.length} (${vipCount} VIP, ${normalCount} Normal)`);
  console.log(`- Active Bots: ${ctrl.botList.length}`);
  console.log(`- Pending Orders: ${pending.length}`);
}

async function runScript(input: string, simulate: boolean): Promise<void> {
  const sim = simulate ? createSimClock() : null;
  const ctrl = sim ? new OrderController(sim.clock) : new OrderController();
  const sleepFn = async (ms: number) => {
    if (sim) sim.advance(ms);
    else await realSleep(ms);
  };
  setupEvents(ctrl);

  console.log("McDonald's Order Management System - Simulation Results");
  console.log('');
  log(ctrl.clock, 'System initialized with 0 bots');

  const lines = input.split('\n');
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (await execCmd(ctrl, line, sleepFn) === 'exit') break;
  }

  printSummary(ctrl);
  ctrl.destroy();
}

async function interactive(ctrl: OrderController): Promise<void> {
  const c = ctrl.clock;
  log(c, "=== McDonald's Order Management System - Interactive Mode ===");
  log(c, 'Commands: order normal | order vip | bot add | bot remove | status | exit');
  log(c, '');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = (): void => {
    rl.question('> ', async (line) => {
      if ((await execCmd(ctrl, line)) === 'exit') {
        ctrl.destroy();
        log(c, 'Goodbye!');
        rl.close();
      } else {
        prompt();
      }
    });
  };

  prompt();
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => data += chunk);
    process.stdin.on('end', () => resolve(data));
  });
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const simulate = args.includes('--simulate');

  if (!process.stdin.isTTY) {
    const input = await readStdin();
    await runScript(input, simulate);
  } else {
    const ctrl = new OrderController();
    setupEvents(ctrl);
    await interactive(ctrl);
  }
}

main().catch(console.error);
