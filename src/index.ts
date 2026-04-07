import readline from 'readline';
import { OrderManager } from './orderManager.js';
import logger from './logger.js';

/**
 * Returns a promise that resolves after `ms` milliseconds.
 * Allows the simulation to progress step-by-step with real timing.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Scripted simulation ──────────────────────────────────────────────────────

async function main(): Promise<void> {
  logger.initResultFile("McDonald's Order Management System - Simulation Results");

  const manager = new OrderManager();
  logger.log('System initialized with 0 bots');

  // Step 1: Add 3 orders before any bots
  await sleep(500);
  manager.addNormalOrder();   // Order #1 - Normal

  await sleep(500);
  manager.addVIPOrder();      // Order #2 - VIP  (jumps ahead of Order #1)

  await sleep(500);
  manager.addNormalOrder();   // Order #3 - Normal

  // Step 2: Add 2 bots — they immediately pick up pending orders (VIP first)
  await sleep(500);
  manager.addBot();           // Bot #1 picks up VIP Order #2

  await sleep(500);
  manager.addBot();           // Bot #2 picks up Normal Order #1

  // Bots take 10 seconds each; after ~10s both complete their orders.
  // Bot #1 then picks up Normal Order #3; Bot #2 goes idle.

  // Step 3: While bots are processing, add a VIP order after ~12s
  await sleep(12_000);
  manager.addVIPOrder();      // Order #4 - VIP; Bot #2 (idle) picks it up

  // Step 4: Wait for all processing to finish (~10 more seconds)
  await sleep(11_000);

  // Step 5: Remove a bot (newest = Bot #2, should be idle by now)
  manager.removeBot();

  await sleep(500);

  // Final summary
  const status = manager.getStatus();
  const completed = manager.getCompletedOrders();
  const vvipCompleted = completed.filter((o) => o.isVVIP).length;
  const vipCompleted = completed.filter((o) => o.isVIP).length;
  const normalCompleted = completed.filter((o) => !o.isVVIP && !o.isVIP).length;

  logger.write('\nFinal Status:');
  logger.write(`- Total Orders Processed: ${completed.length} (${vvipCompleted} VVIP, ${vipCompleted} VIP, ${normalCompleted} Normal)`);
  logger.write(`- Orders Completed: ${completed.length}`);
  logger.write(`- Active Bots: ${status.bots}`);
  logger.write(`- Pending Orders: ${status.pending}`);

  await logger.closeResultFile();
}

// ─── Interactive TUI ──────────────────────────────────────────────────────────

function printStatusBar(manager: OrderManager): void {
  const s = manager.getStatus();
  const line = `Bots: ${s.bots} (${s.activeBots} active)  Pending: ${s.pending}  Done: ${s.completed}`;
  const width = Math.max(line.length + 4, 46);
  const pad = ' '.repeat(width - line.length - 4);
  console.log('');
  console.log(`┌${'─'.repeat(width - 2)}┐`);
  console.log(`│  ${line}${pad}  │`);
  console.log(`└${'─'.repeat(width - 2)}┘`);
}

function printMenu(): void {
  console.log('  1) Add Normal Order');
  console.log('  2) Add VIP Order');
  console.log('  3) Add VVIP Order');
  console.log('  4) Add Bot');
  console.log('  5) Remove Bot');
  console.log('  6) Show pending queue');
  console.log('  7) Show completed orders');
  console.log('  8) Exit');
}

async function interactive(): Promise<void> {
  logger.initResultFile("McDonald's Order Management System - Interactive Session");

  const manager = new OrderManager();
  logger.log('Interactive session started - System initialized with 0 bots');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  const prompt = (): void => {
    printStatusBar(manager);
    printMenu();
    process.stdout.write('> ');
  };

  const shutdown = async (): Promise<void> => {
    console.log('\nExiting. Goodbye!');
    rl.close();
    await logger.closeResultFile();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);

  prompt();

  for await (const line of rl) {
    const choice = line.trim();
    switch (choice) {
      case '1':
        manager.addNormalOrder();
        break;
      case '2':
        manager.addVIPOrder();
        break;
      case '3':
        manager.addVVIPOrder();
        break;
      case '4':
        manager.addBot();
        break;
      case '5':
        manager.removeBot();
        break;
      case '6': {
        const queue = manager.getPendingQueue();
        if (queue.length === 0) {
          console.log('  (pending queue is empty)');
        } else {
          queue.forEach((o, i) => console.log(`  ${i + 1}. ${o}`));
        }
        break;
      }
      case '7': {
        const done = manager.getCompletedOrders();
        if (done.length === 0) {
          console.log('  (no completed orders yet)');
        } else {
          done.forEach((o, i) => console.log(`  ${i + 1}. ${o}`));
        }
        break;
      }
      case '8':
        await shutdown();
        return;
      default:
        console.log(`  Unknown option: "${choice}". Enter 1-8.`);
    }
    prompt();
  }

  // EOF on stdin (e.g. piped input finished)
  await shutdown();
}

// ─── Entry point ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isInteractive = args.includes('--interactive') || args.includes('-i');

if (isInteractive) {
  interactive().catch((err: unknown) => {
    console.error('Interactive session failed:', err);
    process.exit(1);
  });
} else {
  main().catch((err: unknown) => {
    console.error('Simulation failed:', err);
    process.exit(1);
  });
}
