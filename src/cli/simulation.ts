import { OrderService } from '../services/order.service';
import { BotService } from '../services/bot.service';
import { Logger } from '../utils/logger';
import * as path from 'path';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function runSimulation(): Promise<void> {
  const outputPath = path.join(process.cwd(), 'scripts', 'result.txt');
  const logger = new Logger(outputPath);

  const orderService = new OrderService();
  const botService = new BotService(orderService);

  // Set up event listener for bot events
  botService.setEventCallback((event: string, data: any) => {
    switch (event) {
      case 'bot:created':
        logger.log(`Bot #${data.bot.id} created - Status: ACTIVE`);
        break;
      case 'bot:removed':
        logger.log(`Bot #${data.bot.id} destroyed while ${data.bot.status}`);
        break;
      case 'bot:idle':
        logger.log(`Bot #${data.bot.id} is now IDLE - No pending orders`);
        break;
      case 'order:processing':
        logger.log(`Bot #${data.bot.id} picked up ${data.order.type} Order #${data.order.id} - Status: PROCESSING`);
        break;
      case 'order:completed':
        logger.log(`Bot #${data.bot.id} completed ${data.order.type} Order #${data.order.id} - Status: COMPLETE (Processing time: 10s)`);
        break;
      case 'order:returned':
        logger.log(`Order #${data.orderId} returned to PENDING (Bot #${data.botId} was removed)`);
        break;
    }
  });

  logger.log("McDonald's Order Management System - Simulation Results");
  logger.log('');
  logger.log(`System initialized with ${botService.getBotCount()} bots`);

  // Scenario: Demonstrate all requirements including bot removal during processing

  // 1. Create normal order
  await sleep(1000);
  const order1 = orderService.createOrder('NORMAL');
  logger.log(`Created Normal Order #${order1.id} - Status: PENDING`);

  // 2. Create VIP order (should go before normal order)
  await sleep(1000);
  const order2 = orderService.createOrder('VIP');
  logger.log(`Created VIP Order #${order2.id} - Status: PENDING`);

  // 3. Create another normal order
  await sleep(1000);
  const order3 = orderService.createOrder('NORMAL');
  logger.log(`Created Normal Order #${order3.id} - Status: PENDING`);

  // 4. Add first bot (should process VIP order first - demonstrates VIP priority)
  await sleep(1000);
  botService.addBot();

  // 5. Add second bot (should process first normal order)
  await sleep(1000);
  botService.addBot();

  // 6. IMPORTANT: Remove bot #2 while it's PROCESSING order #1
  //    This demonstrates requirement: "When bot is removed while processing, order returns to PENDING"
  await sleep(2000); // Wait 2 seconds (bot is still processing)
  logger.log(`Removing Bot #2 while it is PROCESSING Order #${order1.id}...`);
  botService.removeBot();

  // 7. Wait a moment to see order returned to pending and picked up by another bot
  await sleep(1000);

  // 8. Create a new VIP order to test priority again
  const order4 = orderService.createOrder('VIP');
  logger.log(`Created VIP Order #${order4.id} - Status: PENDING`);

  // 9. Add a third bot to help process remaining orders
  await sleep(1000);
  botService.addBot();

  // Wait for all orders to complete
  await sleep(12000);

  // 10. Remove bot while IDLE to show the difference
  await sleep(1000);
  logger.log(`Removing a bot while IDLE...`);
  botService.removeBot();

  await sleep(500);

  // Log final status
  logger.logFinalStatus(orderService, botService);

  console.log('\nSimulation completed. Results written to scripts/result.txt');
}
