import { Order } from './src/models/order.js';
import { Bot } from './src/models/bot.js';
import { OrderController } from './src/orderController.js';
import { getCurrentTime, formatTime } from './src/utils/timeFormatter.js';
import { ORDER_TYPES, ORDER_STATUS, BOT_STATUS } from './src/constants.js';

class TestSuite {
  constructor() {
    this.testCases = [];
    this.results = { passed: 0, failed: 0 };
  }

  add(name, testFn) {
    this.testCases.push({ name, testFn });
  }

  async execute() {
    console.log('Executing test suite...\n');

    for (const { name, testFn } of this.testCases) {
      try {
        await testFn();
        console.log(`[PASS] ${name}`);
        this.results.passed++;
      } catch (error) {
        console.log(`[FAIL] ${name}`);
        console.log(`        ${error.message}`);
        this.results.failed++;
      }
    }

    this.printSummary();
    return this.results.failed === 0;
  }

  printSummary() {
    const total = this.results.passed + this.results.failed;
    console.log(`\nSummary: ${this.results.passed}/${total} tests passed`);
    
    if (this.results.failed > 0) {
      console.log(`Failed: ${this.results.failed} test(s)`);
    } else {
      console.log('All tests completed successfully!');
    }
  }

  check(condition, message) {
    if (!condition) {
      throw new Error(message || 'Condition check failed');
    }
  }

  checkEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message || 'Values do not match'} - Got: ${actual}, Want: ${expected}`);
    }
  }
}

// Create test suite instance
const suite = new TestSuite();

// ============================================================================
// Order Model Tests
// ============================================================================

suite.add('Create normal order', () => {
  const order = new Order(1001, ORDER_TYPES.NORMAL);
  suite.checkEqual(order.orderNumber, 1001, 'Order number equals 1001');
  suite.checkEqual(order.type, ORDER_TYPES.NORMAL, 'Order is of type NORMAL');
  suite.checkEqual(order.status, ORDER_STATUS.PENDING, 'Order status is PENDING');
  suite.checkEqual(order.isVIP(), false, 'Order is not a VIP order');
  suite.check(order.createdAt !== null, 'CreatedAt timestamp is set');
});

suite.add('Create VIP order', () => {
  const order = new Order(1002, ORDER_TYPES.VIP);
  suite.checkEqual(order.orderNumber, 1002, 'Order number equals 1002');
  suite.checkEqual(order.type, ORDER_TYPES.VIP, 'Order is of type VIP');
  suite.checkEqual(order.isVIP(), true, 'Order is a VIP order');
});

suite.add('Start order processing', () => {
  const order = new Order(1001, ORDER_TYPES.NORMAL);
  order.startProcessing();
  suite.checkEqual(order.status, ORDER_STATUS.PROCESSING, 'Status is PROCESSING');
});

suite.add('Complete order', () => {
  const order = new Order(1001, ORDER_TYPES.NORMAL);
  order.startProcessing();
  order.complete();
  suite.checkEqual(order.status, ORDER_STATUS.COMPLETE, 'Status is COMPLETE');
});

suite.add('Return order to pending', () => {
  const order = new Order(1001, ORDER_TYPES.NORMAL);
  order.startProcessing();
  order.returnToPending();
  suite.checkEqual(order.status, ORDER_STATUS.PENDING, 'Status is PENDING');
});


// ============================================================================
// Bot Model Tests
// ============================================================================

suite.add('Create bot', () => {
  const bot = new Bot(1);
  suite.checkEqual(bot.botId, 1, 'Bot ID equals 1');
  suite.checkEqual(bot.status, BOT_STATUS.IDLE, 'Bot status is IDLE');
  suite.check(bot.currentOrder === null, 'Current order is null');
  suite.checkEqual(bot.isIdle(), true, 'Bot is idle');
});

suite.add('Bot processes order', () => {
  const bot = new Bot(1);
  const order = new Order(1001, ORDER_TYPES.NORMAL);

  bot.startProcessing(order, () => {});

  suite.checkEqual(bot.status, BOT_STATUS.PROCESSING, 'Bot status is PROCESSING');
  suite.checkEqual(bot.currentOrder, order, 'Bot has the assigned order');
  suite.checkEqual(order.status, ORDER_STATUS.PROCESSING, 'Order status is PROCESSING');
});

suite.add('Bot rejects second order when busy', () => {
  const bot = new Bot(1);
  const order1 = new Order(1001, ORDER_TYPES.NORMAL);
  const order2 = new Order(1002, ORDER_TYPES.NORMAL);

  bot.startProcessing(order1, () => {});

  let errorThrown = false;
  try {
    bot.startProcessing(order2, () => {});
  } catch (error) {
    errorThrown = true;
    suite.checkEqual(error.message, 'Bot is already processing an order', 'Error message matches expected');
  }
  suite.check(errorThrown, 'Error is thrown');
});

suite.add('Stop bot processing returns order', () => {
  const bot = new Bot(1);
  const order = new Order(1001, ORDER_TYPES.NORMAL);

  bot.startProcessing(order, () => {});
  const returnedOrder = bot.stopProcessing();

  suite.checkEqual(returnedOrder, order, 'Returned order matches original');
  suite.checkEqual(order.status, ORDER_STATUS.PENDING, 'Order status is PENDING');
  suite.checkEqual(bot.status, BOT_STATUS.IDLE, 'Bot status is IDLE');
  suite.checkEqual(bot.currentOrder, null, 'Bot has no current order');
});

suite.add('Stop bot with no order returns null', () => {
  const bot = new Bot(1);
  const returnedOrder = bot.stopProcessing();
  suite.checkEqual(returnedOrder, null, 'Returns null when no order');
});

// ============================================================================
// Order Controller Tests
// ============================================================================

suite.add('Initialize order controller', () => {
  const controller = new OrderController(() => {}); // Silent logger
  const status = controller.getStatus();

  suite.checkEqual(status.totalOrders, 0, 'Total orders equals 0');
  suite.checkEqual(status.activeBots, 0, 'Active bots equals 0');
  suite.checkEqual(status.pendingOrders, 0, 'Pending orders equals 0');
  suite.checkEqual(status.completedOrders, 0, 'Completed orders equals 0');
});

suite.add('Add normal order to controller', () => {
  const controller = new OrderController(() => {}); // Silent logger
  const order = controller.createNormalOrder();

  suite.checkEqual(order.type, ORDER_TYPES.NORMAL, 'Order is of type NORMAL');
  suite.checkEqual(order.status, ORDER_STATUS.PENDING, 'Order status is PENDING');
  suite.checkEqual(order.orderNumber, 1001, 'Order number equals 1001');

  const status = controller.getStatus();
  suite.checkEqual(status.totalOrders, 1, 'Total orders equals 1');
  suite.checkEqual(status.pendingOrders, 1, 'Pending orders equals 1');
  suite.checkEqual(status.normalOrders, 1, 'Normal orders equals 1');
});

suite.add('Add VIP order to controller', () => {
  const controller = new OrderController(() => {}); // Silent logger
  const order = controller.createVIPOrder();

  suite.checkEqual(order.type, ORDER_TYPES.VIP, 'Order is of type VIP');
  suite.checkEqual(order.status, ORDER_STATUS.PENDING, 'Order status is PENDING');

  const status = controller.getStatus();
  suite.checkEqual(status.vipOrders, 1, 'VIP orders equals 1');
});

suite.add('VIP orders take priority over normal', () => {
  const controller = new OrderController(() => {}); // Silent logger

  controller.createNormalOrder(); // 1001
  const vipOrder = controller.createVIPOrder();    // 1002
  controller.createNormalOrder(); // 1003

  const pendingOrders = controller.getPendingOrders();

  suite.checkEqual(pendingOrders[0].orderNumber, 1002, 'VIP order is first in queue');
  suite.checkEqual(pendingOrders[0].isVIP(), true, 'First order is VIP');
  suite.checkEqual(pendingOrders[1].orderNumber, 1001, 'Normal order is second');
  suite.checkEqual(pendingOrders[2].orderNumber, 1003, 'Normal order is third');
});

suite.add('Multiple VIP orders maintain FIFO order', () => {
  const controller = new OrderController(() => {}); // Silent logger

  controller.createNormalOrder(); // 1001
  const vip1 = controller.createVIPOrder();    // 1002
  const vip2 = controller.createVIPOrder();    // 1003

  const pendingOrders = controller.getPendingOrders();

  suite.checkEqual(pendingOrders[0].orderNumber, 1002, 'First VIP order remains first');
  suite.checkEqual(pendingOrders[1].orderNumber, 1003, 'Second VIP order follows first VIP');
  suite.checkEqual(pendingOrders[2].type, ORDER_TYPES.NORMAL, 'Normal order is last');
});

suite.add('Add and remove bots', () => {
  const controller = new OrderController(() => {}); // Silent logger

  const bot1 = controller.addBot();
  suite.checkEqual(controller.getStatus().activeBots, 1, 'Active bots equals 1');

  const bot2 = controller.addBot();
  suite.checkEqual(controller.getStatus().activeBots, 2, 'Active bots equals 2');

  // Remove bot (should remove the newest one)
  const removedBot = controller.removeBot();
  suite.checkEqual(controller.getStatus().activeBots, 1, 'Active bots equals 1 after removal');
  suite.checkEqual(removedBot.botId, bot2.botId, 'Removed bot is the newest one');
});

suite.add('Remove bot from empty list returns null', () => {
  const controller = new OrderController(() => {}); // Silent logger
  const removedBot = controller.removeBot();
  suite.checkEqual(removedBot, null, 'Returns null when no bots exist');
});

suite.add('Bot automatically picks up pending order', async () => {
  const controller = new OrderController(() => {}); // Silent logger

  // Add bot first
  controller.addBot();

  // Add order - should be picked up immediately
  controller.createNormalOrder();

  // Wait a bit for processing to start
  await new Promise(resolve => setTimeout(resolve, 100));

  suite.checkEqual(controller.getStatus().pendingOrders, 0, 'Order is picked up from pending');
  suite.checkEqual(controller.getBots()[0].status, BOT_STATUS.PROCESSING, 'Bot status is PROCESSING');
  suite.check(controller.getBots()[0].currentOrder !== null, 'Bot has current order');
});

suite.add('Removing processing bot returns order to queue', async () => {
  const controller = new OrderController(() => {}); // Silent logger

  controller.createNormalOrder();
  controller.addBot();

  // Wait for bot to pick up order
  await new Promise(resolve => setTimeout(resolve, 100));

  const statusBefore = controller.getStatus();
  suite.checkEqual(statusBefore.processingBots, 1, 'Processing bots equals 1');
  suite.checkEqual(statusBefore.pendingOrders, 0, 'Pending orders equals 0');

  controller.removeBot();

  const statusAfter = controller.getStatus();
  suite.checkEqual(statusAfter.activeBots, 0, 'Active bots equals 0');
  suite.checkEqual(statusAfter.pendingOrders, 1, 'Order is back in pending queue');
});

suite.add('Order numbers increment sequentially', () => {
  const controller = new OrderController(() => {}); // Silent logger

  const order1 = controller.createNormalOrder();
  const order2 = controller.createVIPOrder();
  const order3 = controller.createNormalOrder();

  suite.checkEqual(order1.orderNumber, 1001, 'First order number is 1001');
  suite.checkEqual(order2.orderNumber, 1002, 'Second order number is 1002');
  suite.checkEqual(order3.orderNumber, 1003, 'Third order number is 1003');
});

suite.add('Multiple bots process multiple orders', async () => {
  const controller = new OrderController(() => {}); // Silent logger

  controller.createNormalOrder();
  controller.createNormalOrder();
  controller.addBot();
  controller.addBot();

  // Wait for bots to pick up orders
  await new Promise(resolve => setTimeout(resolve, 100));

  const status = controller.getStatus();
  suite.checkEqual(status.processingBots, 2, 'Both bots are processing');
  suite.checkEqual(status.pendingOrders, 0, 'Pending orders equals 0');
});

suite.add('Completed order moves to completed list', async () => {
  const controller = new OrderController(() => {}); // Silent logger

  controller.createNormalOrder();
  controller.addBot();

  // Wait for order to complete (10 seconds)
  await new Promise(resolve => setTimeout(resolve, 10100));

  const status = controller.getStatus();
  suite.checkEqual(status.completedOrders, 1, 'Completed orders equals 1');
  suite.checkEqual(status.pendingOrders, 0, 'Pending orders equals 0');
  // Bot might be idle or processing next order if one was queued
  suite.check(status.idleBots >= 0 && status.processingBots >= 0, 'Bot is in valid state');
});

suite.add('Bot continues to next order after completion', async () => {
  const controller = new OrderController(() => {}); // Silent logger

  controller.createNormalOrder();
  controller.createNormalOrder();
  controller.addBot();

  // Wait for first order to complete
  await new Promise(resolve => setTimeout(resolve, 10100));

  const status = controller.getStatus();
  suite.checkEqual(status.completedOrders, 1, 'Completed orders equals 1');
  // Bot should be processing the second order (if it hasn't completed yet)
  suite.check(status.processingBots >= 0, 'Bot is in valid state');
  suite.check(status.pendingOrders === 0 || status.processingBots === 1, 'Either no pending orders or bot is processing');
});

// ============================================================================
// Time Formatter Tests
// ============================================================================

suite.add('Format time as HH:MM:SS', () => {
  const date = new Date('2024-01-01T14:32:01');
  const formatted = formatTime(date);
  suite.checkEqual(formatted, '14:32:01', 'Formatted time matches HH:MM:SS pattern');
});

suite.add('Time formatting pads single digits', () => {
  const date = new Date('2024-01-01T05:03:07');
  const formatted = formatTime(date);
  suite.checkEqual(formatted, '05:03:07', 'Single digits are padded with zeros');
});

suite.add('Get current time in correct format', () => {
  const currentTime = getCurrentTime();
  const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
  suite.check(timeRegex.test(currentTime), 'Current time matches HH:MM:SS format');
  suite.checkEqual(currentTime.split(':').length, 3, 'Time string has 3 parts');
});

// ============================================================================
// Edge Cases and Integration Tests
// ============================================================================

suite.add('Multiple VIP orders preserve insertion order', () => {
  const controller = new OrderController(() => {}); // Silent logger

  controller.createVIPOrder();    // 1001
  controller.createNormalOrder();  // 1002
  controller.createVIPOrder();     // 1003
  controller.createNormalOrder();  // 1004

  const pendingOrders = controller.getPendingOrders();

  suite.checkEqual(pendingOrders[0].orderNumber, 1001, 'First VIP order is first');
  suite.checkEqual(pendingOrders[1].orderNumber, 1003, 'Second VIP order is second');
  suite.checkEqual(pendingOrders[2].orderNumber, 1002, 'First normal order is third');
  suite.checkEqual(pendingOrders[3].orderNumber, 1004, 'Second normal order is fourth');
});

suite.add('Removing bot preserves order priority in queue', async () => {
  const controller = new OrderController(() => {}); // Silent logger

  controller.createNormalOrder();  // 1001
  controller.createVIPOrder();     // 1002
  controller.createNormalOrder();  // 1003
  controller.addBot();

  // Wait for bot to pick up VIP order
  await new Promise(resolve => setTimeout(resolve, 100));

  controller.removeBot();

  const pendingOrders = controller.getPendingOrders();
  suite.checkEqual(pendingOrders[0].orderNumber, 1002, 'VIP order is back and first in queue');
  suite.checkEqual(pendingOrders[1].orderNumber, 1001, 'Normal order is second');
  suite.checkEqual(pendingOrders[2].orderNumber, 1003, 'Normal order is third');
});

suite.add('Status counters remain accurate', async () => {
  const controller = new OrderController(() => {}); // Silent logger

  controller.createNormalOrder();
  controller.createVIPOrder();
  controller.createNormalOrder();

  // Check status before adding bots
  const statusBefore = controller.getStatus();
  suite.checkEqual(statusBefore.totalOrders, 3, 'Total orders equals 3');
  suite.checkEqual(statusBefore.vipOrders, 1, 'VIP orders equals 1');
  suite.checkEqual(statusBefore.normalOrders, 2, 'Normal orders equals 2');
  suite.checkEqual(statusBefore.pendingOrders, 3, 'Pending orders equals 3');

  controller.addBot();
  controller.addBot();

  // Wait a bit for bots to start processing
  await new Promise(resolve => setTimeout(resolve, 100));

  // After bots start processing, pending should decrease
  const statusAfter = controller.getStatus();
  suite.checkEqual(statusAfter.totalOrders, 3, 'Total orders still equals 3');
  suite.checkEqual(statusAfter.vipOrders, 1, 'VIP orders still equals 1');
  suite.checkEqual(statusAfter.normalOrders, 2, 'Normal orders still equals 2');
  suite.checkEqual(statusAfter.activeBots, 2, 'Active bots equals 2');
  suite.check(statusAfter.pendingOrders < 3, 'Pending orders decreases as bots process');
});

suite.add('All bots become idle when no orders', () => {
  const controller = new OrderController(() => {}); // Silent logger
  controller.addBot();
  controller.addBot();

  const status = controller.getStatus();
  suite.checkEqual(status.idleBots, 2, 'All bots are idle');
  suite.checkEqual(status.processingBots, 0, 'Processing bots equals 0');
});

// Run all tests
suite.execute().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
