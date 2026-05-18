import * as readline from 'readline';
import { Manager } from './mcdonald.js';
import type { Clock, ManagerEvent } from './mcdonald.js';

function makeLogger(now: () => number): (msg: string) => void {
  const d = () => new Date(now()).toISOString().slice(11, 19);
  return (msg) => console.log(`[${d()}] ${msg}`);
}

function formatEvent(e: ManagerEvent): string {
  switch (e.type) {
    case 'order_created': return `Created ${e.order.type.toUpperCase()} Order #${e.order.id} - Status: PENDING`;
    case 'bot_created': return `Bot #${e.botId} created - Status: ${e.status}`;
    case 'bot_picked_up': return `Bot #${e.botId} picked up ${e.order.type.toUpperCase()} Order #${e.order.id} - Status: PROCESSING`;
    case 'bot_completed': return `Bot #${e.botId} completed ${e.order.type.toUpperCase()} Order #${e.order.id} - Status: COMPLETE (Processing time: 10s)`;
    case 'bot_idle': return `Bot #${e.botId} is now IDLE - No pending orders`;
    case 'bot_destroyed': return e.order
      ? `Bot #${e.botId} destroyed while processing Order #${e.order.id} - Order returned to PENDING`
      : `Bot #${e.botId} destroyed while IDLE`;
  }
}

function printStatus(mgr: Manager): void {
  const s = mgr.state;
  console.log('--- Status ---');
  console.log(`Pending: [${s.pending.map(o => `#${o.id}(${o.type})`).join(', ')}]`);
  console.log(`Processing: [${s.processing.map(o => `#${o.id}(${o.type})`).join(', ')}]`);
  console.log(`Complete: [${s.completed.map(o => `#${o.id}(${o.type})`).join(', ')}]`);
  console.log(`Bots: ${s.activeBots} (${s.activeBots - s.processing.length} idle, ${s.processing.length} active)`);
}

function createSimClock() {
  const pending: { fn: () => void; at: number }[] = [];
  let now = 0;

  return {
    clock: {
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
    now: () => now,
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

async function execCmd(mgr: Manager, cmd: string, botClock: Clock | undefined, sleepFn?: (ms: number) => Promise<void>): Promise<CmdResult> {
  const c = cmd.trim().toLowerCase();
  const parts = c.split(/\s+/);
  const [action, arg] = parts;

  if (action === 'n' || c === 'order normal') {
    mgr.placeOrder();
  } else if (action === 'v' || c === 'order vip') {
    mgr.placeVipOrder();
  } else if (action === '+' || c === 'bot add') {
    mgr.addBot(botClock);
  } else if (action === '-' || c === 'bot remove') {
    mgr.removeNewestBot();
  } else if (action === 's' || c === 'status') {
    printStatus(mgr);
  } else if (action === 'sleep' && sleepFn && arg) {
    await sleepFn(parseInt(arg, 10));
  } else if (action === 'q' || c === 'exit') {
    return 'exit';
  } else if (action === 'h' || c === 'help') {
    console.log('Commands:');
    console.log('  order normal (n)  - Create normal order');
    console.log('  order vip (v)     - Create VIP order');
    console.log('  bot add (+)       - Add a cooking bot');
    console.log('  bot remove (-)    - Remove newest bot');
    console.log('  status (s)        - Show current status');
    console.log('  exit (q)          - Exit');
    if (sleepFn) console.log('  sleep <ms>        - Wait (virtual or real time)');
  } else if (action) {
    console.log(`Unknown command: ${c}. Type 'help' for commands.`);
  }
  return 'continue';
}

function printSummary(mgr: Manager): void {
  const s = mgr.state;
  const vipCompleted = s.completed.filter(o => o.type === 'vip').length;
  const normalCompleted = s.completed.filter(o => o.type === 'normal').length;
  console.log('');
  console.log('Final Status:');
  console.log(`- Total Orders: ${s.totalProcessed}`);
  console.log(`- Orders Completed: ${s.completedCount} (${vipCompleted} VIP, ${normalCompleted} Normal)`);
  console.log(`- Active Bots: ${s.activeBots}`);
  console.log(`- Pending Orders: ${s.pendingCount}`);
}

async function runWithReadline(mgr: Manager, rl: readline.Interface, botClock: Clock | undefined, sleepFn: (ms: number) => Promise<void>, showPrompt: boolean): Promise<void> {
  return new Promise((resolve) => {
    const next = () => {
      if (showPrompt) rl.prompt();
    };

    rl.on('line', async (line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) { next(); return; }
      if ((await execCmd(mgr, trimmed, botClock, sleepFn)) === 'exit') {
        mgr.release();
        console.log('Goodbye!');
        rl.close();
      } else {
        next();
      }
    });

    rl.on('close', () => {
      mgr.release();
      printSummary(mgr);
      resolve();
    });

    next();
  });
}

async function main(): Promise<void> {
  const simulate = process.argv.slice(2).includes('--simulate');
  const isPipe = !process.stdin.isTTY;

  const sim = simulate ? createSimClock() : null;
  const mgr = new Manager();
  const log = makeLogger(sim ? sim.now : () => Date.now());
  mgr.onEvent = (e) => log(formatEvent(e));

  const sleepFn = async (ms: number) => {
    if (sim) sim.advance(ms);
    else await realSleep(ms);
  };

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> ',
  });

  if (isPipe) {
    console.log("McDonald's Order Management System - Simulation Results\n");
  } else {
    console.log("=== McDonald's Order Management System - Interactive Mode ===");
    console.log('Commands: order normal | order vip | bot add | bot remove | status | exit\n');
  }

  console.log('System initialized with 0 bots');
  await runWithReadline(mgr, rl, sim?.clock, sleepFn, !isPipe);
}

main().catch(console.error);
