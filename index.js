import { OrderController } from './OrderController.js';

/**
 * Format time as HH:MM:SS
 */
function formatTime(date) {
  return date.toTimeString().split(' ')[0];
}

/**
 * Simulate McDonald's order management system
 */
async function runSimulation() {
  const controller = new OrderController();
  const logs = [];

  function log(message) {
    const timestamp = formatTime(new Date());
    const logMessage = `[${timestamp}] ${message}`;
    logs.push(logMessage);
    console.log(logMessage);
  }

  // Helper to wait
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  log("McDonald's Order Management System - Simulation Started");
  log("System initialized with 0 bots\n");

  // Scenario 1: Create orders
  log("=== Creating Initial Orders ===");
  const order1 = controller.createOrder('NORMAL');
  log(`Created Normal Order #${order1.id} - Status: PENDING`);

  await wait(1000);

  const order2 = controller.createOrder('VIP');
  log(`Created VIP Order #${order2.id} - Status: PENDING (moved to front)`);

  await wait(1000);

  const order3 = controller.createOrder('NORMAL');
  log(`Created Normal Order #${order3.id} - Status: PENDING\n`);

  await wait(1000);

  // Scenario 2: Add first bot
  log("=== Adding First Bot ===");
  const bot1 = controller.addBot();
  log(`Bot #${bot1.id} created - Status: ${bot1.status}`);
  log(`Bot #${bot1.id} picked up VIP Order #${bot1.currentOrder.id} - Status: PROCESSING\n`);

  await wait(1000);

  // Scenario 3: Add second bot
  log("=== Adding Second Bot ===");
  const bot2 = controller.addBot();
  log(`Bot #${bot2.id} created - Status: ${bot2.status}`);
  log(`Bot #${bot2.id} picked up Normal Order #${bot2.currentOrder.id} - Status: PROCESSING\n`);

  // Wait for first order to complete
  await wait(10000);

  log("=== Orders Completing ===");
  const completed1 = controller.getCompletedOrders()[0];
  log(`Bot #${bot1.id} completed ${completed1.type} Order #${completed1.id} - Status: COMPLETE (Processing time: 10s)`);
  log(`Bot #${bot1.id} picked up Normal Order #${bot1.currentOrder.id} - Status: PROCESSING\n`);

  await wait(1000);

  const completed2 = controller.getCompletedOrders()[1];
  log(`Bot #${bot2.id} completed ${completed2.type} Order #${completed2.id} - Status: COMPLETE (Processing time: 10s)`);
  log(`Bot #${bot2.id} is now IDLE - No pending orders\n`);

  await wait(2000);

  // Scenario 4: New VIP order while bots are working
  log("=== New VIP Order Arrives ===");
  const order4 = controller.createOrder('VIP');
  log(`Created VIP Order #${order4.id} - Status: PENDING`);
  log(`Bot #${bot2.id} picked up VIP Order #${order4.id} - Status: PROCESSING\n`);

  // Wait for remaining orders to complete
  await wait(8000);

  log("=== Final Orders Completing ===");
  const completed3 = controller.getCompletedOrders()[2];
  log(`Bot #${bot1.id} completed ${completed3.type} Order #${completed3.id} - Status: COMPLETE (Processing time: 10s)`);
  log(`Bot #${bot1.id} is now IDLE - No pending orders\n`);

  await wait(2000);

  const completed4 = controller.getCompletedOrders()[3];
  log(`Bot #${bot2.id} completed ${completed4.type} Order #${completed4.id} - Status: COMPLETE (Processing time: 10s)\n`);

  // Scenario 5: Remove a bot
  log("=== Removing Bot ===");
  const removedBot = controller.removeBot();
  log(`Bot #${removedBot.id} destroyed while IDLE\n`);

  // Final status
  const status = controller.getStatus();
  log("=== Final Status ===");
  log(`Total Orders Processed: ${status.completedOrders} (${controller.getCompletedOrders().filter(o => o.type === 'VIP').length} VIP, ${controller.getCompletedOrders().filter(o => o.type === 'NORMAL').length} Normal)`);
  log(`Orders Completed: ${status.completedOrders}`);
  log(`Active Bots: ${status.totalBots}`);
  log(`Pending Orders: ${status.pendingOrders}`);

  return logs.join('\n');
}

// Run simulation if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  runSimulation().catch(console.error);
}

export { runSimulation };
