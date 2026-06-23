const assert = require('node:assert/strict');
const test = require('node:test');

const {
  BOT_STATUS,
  EVENT_TYPES,
  ORDER_TYPES,
  ORDER_STATUS,
  OrderController,
} = require('../dist/domain/order-controller');
const { formatTimestamp, runDemoScenario } = require('../dist/scenarios/demo-scenario');

test('creates unique increasing order numbers', () => {
  const controller = new OrderController();
  controller.drainEvents();

  const firstOrder = controller.createOrder(ORDER_TYPES.NORMAL);
  const secondOrder = controller.createOrder(ORDER_TYPES.VIP);

  assert.equal(firstOrder.id, 1001);
  assert.equal(secondOrder.id, 1002);
});

test('queues VIP orders before normal orders while keeping FIFO order within each type', () => {
  const controller = new OrderController();
  controller.drainEvents();

  const normalOne = controller.createOrder(ORDER_TYPES.NORMAL);
  const vipOne = controller.createOrder(ORDER_TYPES.VIP);
  const normalTwo = controller.createOrder(ORDER_TYPES.NORMAL);
  const vipTwo = controller.createOrder(ORDER_TYPES.VIP);

  assert.deepEqual(
    controller.pendingOrders.map((order) => order.id),
    [vipOne.id, vipTwo.id, normalOne.id, normalTwo.id],
  );
});

test('new bot immediately picks the highest-priority pending order', () => {
  const controller = new OrderController();
  controller.drainEvents();

  controller.createOrder(ORDER_TYPES.NORMAL, 1);
  const vipOrder = controller.createOrder(ORDER_TYPES.VIP, 2);
  const bot = controller.addBot(3);

  assert.equal(bot.status, BOT_STATUS.PROCESSING);
  assert.equal(bot.order.id, vipOrder.id);
  assert.equal(bot.completesAt, 13);
});

test('idle bot immediately picks a newly-created order', () => {
  const controller = new OrderController();
  const bot = controller.addBot(1);
  controller.drainEvents();

  const order = controller.createOrder(ORDER_TYPES.NORMAL, 2);

  assert.equal(bot.status, BOT_STATUS.PROCESSING);
  assert.equal(bot.order.id, order.id);
  assert.equal(controller.pendingOrders.length, 0);
});

test('bot completes after 10 simulated seconds and becomes idle with no pending orders', () => {
  const controller = new OrderController();
  controller.createOrder(ORDER_TYPES.NORMAL, 1);
  const bot = controller.addBot(2);
  controller.drainEvents();

  controller.advanceTo(12);
  const events = controller.drainEvents();

  assert.equal(controller.completedOrders.length, 1);
  assert.equal(controller.completedOrders[0].status, ORDER_STATUS.COMPLETE);
  assert.equal(bot.status, BOT_STATUS.IDLE);
  assert.ok(events.some((event) => event.type === EVENT_TYPES.ORDER_COMPLETED));
  assert.ok(events.some((event) => event.type === EVENT_TYPES.BOT_IDLE));
});

test('completed bot immediately processes another pending order', () => {
  const controller = new OrderController();
  const firstOrder = controller.createOrder(ORDER_TYPES.NORMAL, 1);
  const secondOrder = controller.createOrder(ORDER_TYPES.NORMAL, 2);
  const bot = controller.addBot(3);
  controller.drainEvents();

  controller.advanceTo(13);

  assert.equal(controller.completedOrders[0].id, firstOrder.id);
  assert.equal(bot.status, BOT_STATUS.PROCESSING);
  assert.equal(bot.order.id, secondOrder.id);
  assert.equal(bot.completesAt, 23);
});

test('removing newest processing bot returns its order to the original priority position', () => {
  const controller = new OrderController();
  const normalOne = controller.createOrder(ORDER_TYPES.NORMAL, 1);
  const normalTwo = controller.createOrder(ORDER_TYPES.NORMAL, 2);
  const bot = controller.addBot(3);
  controller.drainEvents();

  controller.removeNewestBot(4);

  assert.deepEqual(
    controller.pendingOrders.map((order) => ({
      id: order.id,
      status: order.status,
    })),
    [
      { id: normalOne.id, status: ORDER_STATUS.PENDING },
      { id: normalTwo.id, status: ORDER_STATUS.PENDING },
    ],
  );
  assert.equal(controller.bots.length, 0);
  assert.equal(bot.order, null);
});

test('removing newest bot removes the latest created bot first', () => {
  const controller = new OrderController();
  const firstBot = controller.addBot(1);
  const secondBot = controller.addBot(2);

  const removedBot = controller.removeNewestBot(3);

  assert.equal(removedBot.id, secondBot.id);
  assert.deepEqual(controller.bots.map((bot) => bot.id), [firstBot.id]);
});

test('formats timestamps as HH:MM:SS', () => {
  assert.equal(formatTimestamp(0), '00:00:00');
  assert.equal(formatTimestamp(3661), '01:01:01');
});

test('demo scenario includes timestamped output and final status', () => {
  const output = runDemoScenario().join('\n');

  assert.match(output, /\[[0-9]{2}:[0-9]{2}:[0-9]{2}\]/);
  assert.match(output, /Hermes Order Controller/);
  assert.match(output, /Total Orders Processed: 4 \(2 VIP, 2 Normal\)/);
});
