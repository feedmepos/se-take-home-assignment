import { Order } from './models/Order';
import { OrderQueue } from './services/OrderQueue';
import { BotManager } from './services/BotManager';
import { FileLogger } from './services/Logger';

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function runDemo(): Promise<void> {
  const logger = new FileLogger();
  const queue = new OrderQueue();
  const processingTimeMs = parseInt(process.env.PROCESSING_TIME_MS ?? '10000');
  const botManager = new BotManager(queue, logger, processingTimeMs);

  let nextOrderId = 1001;
  const allOrders: Order[] = [];

  function addOrder(isVip: boolean): void {
    const order: Order = { id: nextOrderId++, isVip, status: 'PENDING' };
    allOrders.push(order);
    queue.enqueue(order);
    logger.log(`Created ${isVip ? 'VIP' : 'Normal'} Order #${order.id} - Status: PENDING`);
    botManager.tryAssignToIdleBots();
  }

  // Two bots, mixed orders — VIP should be picked first
  botManager.addBot(); // Bot #1
  botManager.addBot(); // Bot #2

  addOrder(false); // Normal #1001 → Bot #1
  addOrder(true);  // VIP   #1002 → Bot #2 (VIP priority, but both bots grabbed immediately)
  addOrder(false); // Normal #1003 → queued
  addOrder(true);  // VIP   #1004 → queued ahead of #1003

  // Remove Bot #2 mid-processing — its order should return to front of queue
  await delay(Math.floor(processingTimeMs / 2));
  botManager.removeBot();

  // Wait for remaining bot to finish the current round
  await delay(processingTimeMs + 500);

  // Add a new normal order to show idle bot picks it up immediately
  addOrder(false); // Normal #1005

  await delay(processingTimeMs + 500);

  botManager.drainAll();

  const completed = allOrders.filter(o => o.status === 'COMPLETE');
  logger.writeFinalStatus({
    totalOrders: allOrders.length,
    vipOrders: allOrders.filter(o => o.isVip).length,
    normalOrders: allOrders.filter(o => !o.isVip).length,
    completedOrders: completed.length,
    activeBots: botManager.getBotCount(),
    pendingOrders: queue.size(),
  });

  process.exit(0);
}
