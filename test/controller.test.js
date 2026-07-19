'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { Controller, OrderType, OrderStatus } = require('../src/controller');
const { BotStatus } = require('../src/bot');
const { FakeTimers } = require('./fake-timers');

const COOK_MS = 10_000;

function setup() {
  const timers = new FakeTimers();
  const controller = new Controller({ processingMs: COOK_MS, timers });
  return { controller, timers };
}

const labels = (orders) => orders.map((order) => `${order.type}#${order.id}`);

test('normal orders queue in submission order', () => {
  const { controller } = setup();
  controller.newOrder(OrderType.NORMAL);
  controller.newOrder(OrderType.NORMAL);

  assert.deepEqual(labels(controller.pendingOrders), ['NORMAL#1', 'NORMAL#2']);
});

test('VIP orders go ahead of normal orders but behind existing VIP orders', () => {
  const { controller } = setup();
  controller.newOrder(OrderType.NORMAL);
  controller.newOrder(OrderType.NORMAL);
  controller.newOrder(OrderType.VIP);
  controller.newOrder(OrderType.VIP);

  assert.deepEqual(labels(controller.pendingOrders), ['VIP#3', 'VIP#4', 'NORMAL#1', 'NORMAL#2']);
});

test('order numbers are unique and increasing across both types', () => {
  const { controller } = setup();
  const ids = [
    controller.newOrder(OrderType.NORMAL).id,
    controller.newOrder(OrderType.VIP).id,
    controller.newOrder(OrderType.NORMAL).id,
    controller.newOrder(OrderType.VIP).id,
  ];

  assert.deepEqual(ids, [1, 2, 3, 4]);
});

test('a new bot immediately picks up a pending order and completes it after the cooking time', () => {
  const { controller, timers } = setup();
  const order = controller.newOrder(OrderType.NORMAL);
  const bot = controller.addBot();

  assert.equal(bot.status, BotStatus.PROCESSING);
  assert.equal(order.status, OrderStatus.PROCESSING);
  assert.deepEqual(controller.pendingOrders, []);

  timers.advance(COOK_MS - 1);
  assert.equal(order.status, OrderStatus.PROCESSING);

  timers.advance(1);
  assert.equal(order.status, OrderStatus.COMPLETE);
  assert.deepEqual(labels(controller.completedOrders), ['NORMAL#1']);
  assert.equal(bot.status, BotStatus.IDLE);
});

test('a bot works through the queue in VIP-first order, then goes idle', () => {
  const { controller, timers } = setup();
  controller.newOrder(OrderType.NORMAL);
  controller.newOrder(OrderType.VIP);
  const bot = controller.addBot();

  timers.advance(COOK_MS);
  assert.deepEqual(labels(controller.completedOrders), ['VIP#2']);

  timers.advance(COOK_MS);
  assert.deepEqual(labels(controller.completedOrders), ['VIP#2', 'NORMAL#1']);
  assert.equal(bot.status, BotStatus.IDLE);
  assert.equal(timers.scheduledCount, 0);
});

test('a bot with an empty queue stays idle until an order arrives', () => {
  const { controller, timers } = setup();
  const bot = controller.addBot();
  assert.equal(bot.status, BotStatus.IDLE);

  controller.newOrder(OrderType.NORMAL);
  assert.equal(bot.status, BotStatus.PROCESSING);

  timers.advance(COOK_MS);
  assert.deepEqual(labels(controller.completedOrders), ['NORMAL#1']);
});

test('two bots cook two orders in parallel', () => {
  const { controller, timers } = setup();
  controller.newOrder(OrderType.NORMAL);
  controller.newOrder(OrderType.NORMAL);
  controller.addBot();
  controller.addBot();

  assert.deepEqual(controller.pendingOrders, []);
  timers.advance(COOK_MS);
  assert.deepEqual(labels(controller.completedOrders), ['NORMAL#1', 'NORMAL#2']);
});

test('removing a bot returns its order to its original queue position', () => {
  const { controller } = setup();
  controller.newOrder(OrderType.VIP);
  controller.newOrder(OrderType.VIP);
  controller.newOrder(OrderType.VIP);
  controller.addBot();
  controller.addBot();

  // Bot 1 took VIP#1 and bot 2 took VIP#2, leaving VIP#3 pending.
  assert.deepEqual(labels(controller.pendingOrders), ['VIP#3']);

  controller.removeBot();
  assert.deepEqual(labels(controller.pendingOrders), ['VIP#2', 'VIP#3']);
});

test('an interrupted order keeps its VIP priority over normal orders', () => {
  const { controller, timers } = setup();
  controller.newOrder(OrderType.VIP);
  controller.newOrder(OrderType.NORMAL);
  controller.addBot();

  timers.advance(5_000);
  controller.removeBot();

  assert.deepEqual(labels(controller.pendingOrders), ['VIP#1', 'NORMAL#2']);
});

test('removing a bot cancels its cooking so the order never completes on its own', () => {
  const { controller, timers } = setup();
  const order = controller.newOrder(OrderType.NORMAL);
  controller.addBot();

  timers.advance(5_000);
  controller.removeBot();

  assert.equal(order.status, OrderStatus.PENDING);
  assert.equal(timers.scheduledCount, 0);

  timers.advance(COOK_MS * 2);
  assert.deepEqual(controller.completedOrders, []);
  assert.deepEqual(labels(controller.pendingOrders), ['NORMAL#1']);
  assert.equal(order.status, OrderStatus.PENDING)
});

test('a requeued order restarts the full cooking time when picked up again', () => {
  const { controller, timers } = setup();
  const order = controller.newOrder(OrderType.NORMAL);
  controller.addBot();

  timers.advance(9_000);
  controller.removeBot();
  controller.addBot();

  timers.advance(COOK_MS - 1);
  assert.equal(order.status, OrderStatus.PROCESSING);

  timers.advance(1);
  assert.equal(order.status, OrderStatus.COMPLETE);
});

test('removing a bot destroys the newest one', () => {
  const { controller } = setup();
  const first = controller.addBot();
  const second = controller.addBot();

  assert.equal(controller.removeBot().id, second.id);
  assert.deepEqual(
    controller.bots.map((bot) => bot.id),
    [first.id],
  );
});

test('an interrupted order is picked up by a remaining idle bot', () => {
  const { controller, timers } = setup();
  controller.newOrder(OrderType.NORMAL);
  controller.addBot();
  const spare = controller.addBot();

  assert.equal(spare.status, BotStatus.IDLE);

  controller.removeBot();
  // The spare bot was destroyed (newest first), so the order is still being proceeded by the first bot.
  assert.deepEqual(labels(controller.pendingOrders), []);

  controller.removeBot();
  assert.deepEqual(labels(controller.pendingOrders), ['NORMAL#1']);

  controller.addBot();
  timers.advance(COOK_MS);
  assert.deepEqual(labels(controller.completedOrders), ['NORMAL#1']);
});

test('removing a bot when there are none is a no-op', () => {
  const { controller } = setup();
  assert.equal(controller.removeBot(), null);
  assert.deepEqual(controller.bots, []);
});

test('rejects unknown order types', () => {
  const { controller } = setup();
  assert.throws(() => controller.newOrder('GOLD'), /Unknown order type/);
});
