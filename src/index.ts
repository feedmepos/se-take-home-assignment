import { BotManagerService } from './manager/bot-manager.service.js';
import { Order } from './order/order.model.js';
import { Bot } from './bot/bot.model.js';

function timestamp(): string {
  const now = new Date();
  return now.toTimeString().slice(0, 8);
}

function formatOrders(orders: Order[]): string {
  if (orders.length === 0) return '[]';
  return '[' + orders.map((o) => `#${o.id}(${o.type.toUpperCase()})`).join(', ') + ']';
}

function formatBots(bots: Bot[]): string {
  if (bots.length === 0) return '[]';
  return '[' + bots.map((b) => `Bot#${b.id}(${b.status}${b.currentOrder ? `:Order#${b.currentOrder.id}` : ''})`).join(', ') + ']';
}

function printStatus(manager: BotManagerService): void {
  console.log(`[${timestamp()}] PENDING: ${formatOrders(manager.getPendingOrders())}`);
  console.log(`[${timestamp()}] COMPLETE: ${formatOrders(manager.getCompletedOrders())}`);
  console.log(`[${timestamp()}] BOTS: ${formatBots(manager.getBots())}`);
  console.log('---');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const manager = new BotManagerService();

  manager.on('order:pending', ({ order }) => {
    console.log(`[${timestamp()}] New ${order.type.toUpperCase()} Order #${order.id} added to PENDING`);
  });

  manager.on('order:processing', ({ order, bot }) => {
    console.log(`[${timestamp()}] Bot #${bot.id} started processing Order #${order.id}`);
  });

  manager.on('order:complete', ({ order, bot }) => {
    console.log(`[${timestamp()}] Bot #${bot.id} completed Order #${order.id}`);
  });

  manager.on('bot:added', ({ bot }) => {
    console.log(`[${timestamp()}] Bot #${bot.id} added`);
  });

  manager.on('bot:removed', ({ bot, returnedOrder }) => {
    const msg = returnedOrder
      ? ` — Order #${returnedOrder.id} returned to PENDING`
      : '';
    console.log(`[${timestamp()}] Bot #${bot.id} removed${msg}`);
  });

  console.log(`[${timestamp()}] === McDonald's Bot Manager Demo ===\n`);

  // Step 1: Add normal orders
  console.log(`[${timestamp()}] >> Adding 2 Normal Orders`);
  manager.addNormalOrder();
  manager.addNormalOrder();
  printStatus(manager);

  // Step 2: Add VIP order (should appear before normal orders)
  console.log(`[${timestamp()}] >> Adding 1 VIP Order`);
  manager.addVipOrder();
  printStatus(manager);

  // Step 3: Add first bot (should process VIP order first)
  console.log(`[${timestamp()}] >> Adding Bot 1`);
  manager.addBot();
  printStatus(manager);

  // Step 4: Add another normal order
  console.log(`[${timestamp()}] >> Adding 1 Normal Order`);
  manager.addNormalOrder();
  printStatus(manager);

  // Step 5: Wait for first order to complete
  console.log(`[${timestamp()}] >> Waiting 10 seconds for order to complete...`);
  await sleep(10_000);
  printStatus(manager);

  // Step 6: Add second bot
  console.log(`[${timestamp()}] >> Adding Bot 2`);
  manager.addBot();
  printStatus(manager);

  // Step 7: Wait 5 seconds, then remove newest bot
  console.log(`[${timestamp()}] >> Waiting 5 seconds...`);
  await sleep(5_000);
  console.log(`[${timestamp()}] >> Removing newest bot`);
  manager.removeBot();
  printStatus(manager);

  // Step 8: Let remaining bot finish all orders
  console.log(`[${timestamp()}] >> Waiting for remaining orders to complete...`);
  await sleep(30_000);
  printStatus(manager);

  console.log(`[${timestamp()}] === Demo Complete ===`);
}

main();
