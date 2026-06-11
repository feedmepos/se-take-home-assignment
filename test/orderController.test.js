const test = require('node:test');
const assert = require('node:assert/strict');
const { createLogger } = require('../src/logger');
const { OrderController } = require('../src/orderController');

const TEST_PROCESSING_MS = 10;

function createTestController() {
  const logger = createLogger();
  const controller = new OrderController(logger, { processingTimeMs: TEST_PROCESSING_MS });
  return { controller, logger };
}

function waitForProcessing() {
  return new Promise((resolve) => setTimeout(resolve, TEST_PROCESSING_MS + 20));
}

test('order ids increase', () => {
  const { controller } = createTestController();

  const first = controller.createOrder('normal');
  const second = controller.createOrder('vip');

  assert.equal(first.id, 1001);
  assert.equal(second.id, 1002);
});

test('VIP orders are placed before normal orders', () => {
  const { controller } = createTestController();

  controller.createOrder('normal');
  controller.createOrder('vip');
  controller.createOrder('normal');

  assert.deepEqual(
    controller.pendingOrders.map((order) => `${order.type}#${order.id}`),
    ['vip#1002', 'normal#1001', 'normal#1003']
  );
});

test('new VIP order stays behind existing VIP orders', () => {
  const { controller } = createTestController();

  controller.createOrder('vip');
  controller.createOrder('normal');
  controller.createOrder('vip');

  assert.deepEqual(
    controller.pendingOrders.map((order) => order.id),
    [1001, 1003, 1002]
  );
});

test('bot processes VIP order first', async () => {
  const { controller } = createTestController();

  controller.createOrder('normal');
  controller.createOrder('vip');
  controller.addBot();

  assert.equal(controller.bots[0].currentOrder.id, 1002);

  await waitForProcessing();

  assert.equal(controller.completedOrders[0].id, 1002);
});

test('bot becomes idle when no pending orders remain', async () => {
  const { controller, logger } = createTestController();

  controller.createOrder('normal');
  controller.addBot();

  await waitForProcessing();

  assert.equal(controller.pendingOrders.length, 0);
  assert.match(logger.lines.join('\n'), /is now IDLE - No pending orders/);
});

test('removing idle bot logs destroyed while IDLE', () => {
  const { controller, logger } = createTestController();

  controller.addBot();
  controller.removeBot();

  assert.equal(controller.bots.length, 0);
  assert.match(logger.lines.join('\n'), /destroyed while IDLE/);
});

test('removing processing bot returns order to queue position', async () => {
  const { controller } = createTestController();

  controller.createOrder('vip');
  controller.createOrder('normal');
  controller.createOrder('normal');
  controller.addBot();
  controller.addBot();

  assert.equal(controller.bots[0].currentOrder.id, 1001);
  assert.equal(controller.bots[1].currentOrder.id, 1002);

  controller.removeBot();

  assert.equal(controller.pendingOrders.length, 2);
  assert.equal(controller.pendingOrders[0].id, 1002);
  assert.equal(controller.pendingOrders[1].id, 1003);
  assert.equal(controller.bots.length, 1);
});

test('returned order keeps VIP priority and FIFO among same type', () => {
  const { controller } = createTestController();

  controller.createOrder('normal');
  controller.addBot();

  assert.equal(controller.bots[0].currentOrder.id, 1001);

  controller.createOrder('vip');
  controller.removeBot();

  assert.deepEqual(
    controller.pendingOrders.map((order) => `${order.type}#${order.id}`),
    ['vip#1002', 'normal#1001']
  );
});

test('returned VIP stays behind earlier VIP orders', () => {
  const { controller } = createTestController();

  controller.createOrder('vip');
  controller.addBot();

  assert.equal(controller.bots[0].currentOrder.id, 1001);

  controller.createOrder('vip');
  controller.createOrder('normal');
  controller.removeBot();

  assert.deepEqual(
    controller.pendingOrders.map((order) => order.id),
    [1001, 1002, 1003]
  );
});

test('logger output includes HH:MM:SS timestamps', () => {
  const { logger } = createTestController();

  logger.log('test message');

  assert.match(logger.lines[0], /\[\d{2}:\d{2}:\d{2}\] test message/);
});
