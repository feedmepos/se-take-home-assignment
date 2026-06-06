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

  // Demo sequence mirrors the example result.txt
  addOrder(false); // Normal #1
  addOrder(false); // Normal #2
  addOrder(true);  // VIP #3

  await delay(200);
  botManager.addBot(); // Bot #1 → picks up VIP #3
  await delay(200);
  botManager.addBot(); // Bot #2 → picks up Normal #1

  // Wait for first processing round to complete
  await delay(processingTimeMs + 1000);

  addOrder(true); // VIP #4 → idle bot picks it up

  // Wait for second round
  await delay(processingTimeMs + 1000);

  botManager.removeBot(); // Remove last bot (LIFO) — should be IDLE
  await delay(300);

  const completed = allOrders.filter(o => o.status === 'COMPLETE');
  logger.writeFinalStatus({
    totalOrders: completed.length,
    vipOrders: completed.filter(o => o.isVip).length,
    normalOrders: completed.filter(o => !o.isVip).length,
    completedOrders: completed.length,
    activeBots: botManager.getBotCount(),
    pendingOrders: queue.size(),
  });

  botManager.drainAll();
  process.exit(0);
}
