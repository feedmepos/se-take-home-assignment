'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { OrderController } = require('../src/order-controller');
const { ManualClock } = require('../src/manual-clock');

function setup() {
  const clock = new ManualClock();
  const events = [];
  const controller = new OrderController({ clock, onEvent: (event) => events.push(event) });
  return { clock, events, controller };
}

const ids = (orders) => orders.map((order) => order.id);

test('order numbers increase and pending orders use VIP priority with FIFO within a class', () => {
  const { controller } = setup();
  assert.deepEqual([
    controller.addOrder('Normal'), controller.addOrder('VIP'),
    controller.addOrder('Normal'), controller.addOrder('VIP'),
  ], [1, 2, 3, 4]);
  assert.deepEqual(ids(controller.getState().pending), [2, 4, 1, 3]);
});

test('one bot processes one order for exactly ten seconds and then takes the next', () => {
  const { clock, controller, events } = setup();
  controller.addOrder('Normal');
  controller.addOrder('VIP');
  controller.addBot();
  assert.deepEqual(ids(controller.getState().pending), [1]);
  assert.equal(controller.getState().processing[0].order.id, 2);
  clock.advance(9_999);
  assert.deepEqual(ids(controller.getState().complete), []);
  clock.advance(1);
  assert.deepEqual(ids(controller.getState().complete), [2]);
  assert.equal(controller.getState().processing[0].order.id, 1);
  clock.advance(10_000);
  assert.deepEqual(ids(controller.getState().complete), [2, 1]);
  assert.deepEqual(controller.getState().bots, [{ id: 1, status: 'IDLE' }]);
  const completions = events.filter((event) => event.message.includes('completed'));
  assert.deepEqual(completions.map((event) => event.time), [clock.now() - 10_000, clock.now()]);
});

test('adding a bot starts queued work immediately and idle bots take later orders', () => {
  const { clock, controller } = setup();
  controller.addOrder('Normal');
  controller.addOrder('Normal');
  controller.addBot();
  controller.addBot();
  assert.deepEqual(controller.getState().processing.map(({ order }) => order.id), [1, 2]);
  clock.advance(10_000);
  assert.deepEqual(ids(controller.getState().complete), [1, 2]);
  controller.addOrder('VIP');
  assert.equal(controller.getState().processing[0].order.id, 3);
});

test('removing newest busy bot cancels work and restores original queue position', () => {
  const { clock, controller } = setup();
  controller.addOrder('VIP'); // #1
  controller.addOrder('VIP'); // #2
  controller.addOrder('VIP'); // #3
  controller.addOrder('Normal'); // #4
  controller.addBot(); // bot #1 takes VIP #1
  controller.addBot(); // bot #2 takes VIP #2
  controller.addOrder('VIP'); // #5 is behind existing VIP #3
  clock.advance(4_000);
  assert.equal(controller.removeBot(), 2);
  assert.deepEqual(ids(controller.getState().pending), [2, 3, 5, 4]);
  assert.deepEqual(controller.getState().processing.map(({ botId }) => botId), [1]);
  clock.advance(6_000);
  assert.deepEqual(ids(controller.getState().complete), [1]);
  assert.equal(controller.getState().processing[0].order.id, 2);
  clock.advance(4_000); // Old completion time for canceled bot #2.
  assert.deepEqual(ids(controller.getState().complete), [1]);
  clock.advance(6_000);
  assert.deepEqual(ids(controller.getState().complete), [1, 2]);
});

test('a canceled order needs a fresh ten seconds when another bot takes it', () => {
  const { clock, controller } = setup();
  controller.addOrder('Normal');
  controller.addBot();
  clock.advance(9_000);
  controller.removeBot();
  assert.deepEqual(ids(controller.getState().pending), [1]);
  controller.addBot();
  clock.advance(1_000);
  assert.deepEqual(ids(controller.getState().complete), []);
  clock.advance(9_000);
  assert.deepEqual(ids(controller.getState().complete), [1]);
});

test('removing an idle bot removes the newest one; removing from zero is harmless', () => {
  const { controller } = setup();
  controller.addBot();
  controller.addBot();
  assert.equal(controller.removeBot(), 2);
  assert.deepEqual(controller.getState().bots, [{ id: 1, status: 'IDLE' }]);
  assert.equal(controller.removeBot(), 1);
  assert.equal(controller.removeBot(), null);
});

test('invalid order types are rejected without consuming an order number', () => {
  const { controller } = setup();
  assert.throws(() => controller.addOrder('regular'), TypeError);
  assert.equal(controller.addOrder('Normal'), 1);
});
