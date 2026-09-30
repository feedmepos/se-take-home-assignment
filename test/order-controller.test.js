'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { OrderController } = require('../src/order-controller');
const { VirtualClock } = require('../src/virtual-clock');

function setup() {
  const clock = new VirtualClock();
  const events = [];
  const controller = new OrderController({ clock, onEvent: event => events.push(event) });
  return { clock, events, controller };
}

test('orders have increasing IDs and waiting VIPs keep FIFO priority', () => {
  const { controller } = setup();
  assert.equal(controller.addOrder('Normal'), 1);
  assert.equal(controller.addOrder('VIP'), 2);
  assert.equal(controller.addOrder('Normal'), 3);
  assert.equal(controller.addOrder('VIP'), 4);
  assert.deepEqual(controller.snapshot().pending.map(order => order.id), [2, 4, 1, 3]);
  assert.throws(() => controller.addOrder('Other'), /Order type/);
});

test('each bot cooks one order for exactly 10 seconds, then picks up the next', () => {
  const { controller, clock, events } = setup();
  controller.addOrder('Normal');
  controller.addOrder('VIP');
  controller.addBot();
  assert.equal(controller.snapshot().bots[0].orderId, 2);
  clock.advance(9_999);
  assert.equal(controller.snapshot().complete.length, 0);
  clock.advance(1);
  assert.deepEqual(controller.snapshot().complete.map(order => order.id), [2]);
  assert.equal(controller.snapshot().bots[0].orderId, 1);
  clock.advance(10_000);
  assert.deepEqual(controller.snapshot().complete.map(order => order.id), [2, 1]);
  assert.equal(controller.snapshot().bots[0].status, 'IDLE');
  assert.deepEqual(events.filter(event => event.type === 'order-completed').map(event => event.time.toISOString().slice(11, 19)), ['12:00:10', '12:00:20']);
});

test('idle bot immediately picks up a new order', () => {
  const { controller, clock } = setup();
  controller.addBot();
  assert.equal(controller.snapshot().bots[0].status, 'IDLE');
  controller.addOrder('VIP');
  assert.equal(controller.snapshot().bots[0].orderId, 1);
  clock.advance(10_000);
  assert.deepEqual(controller.snapshot().complete.map(order => order.id), [1]);
});

test('removing newest bot cancels its cook and restores order priority', () => {
  const { controller, clock } = setup();
  controller.addOrder('Normal'); // #1
  controller.addOrder('VIP');    // #2
  controller.addOrder('Normal'); // #3
  controller.addBot();          // #2
  clock.advance(1_000);
  controller.addBot();          // #1
  clock.advance(2_000);
  controller.addOrder('VIP');   // #4
  assert.equal(controller.removeBot(), 2);
  assert.deepEqual(controller.snapshot().pending.map(order => order.id), [2, 4, 1, 3]);
  assert.equal(controller.snapshot().pending.find(order => order.id === 1).status, 'PENDING');
  clock.advance(8_000);
  assert.deepEqual(controller.snapshot().complete.map(order => order.id), [2]);
  assert.equal(controller.snapshot().bots[0].orderId, 4);
  clock.advance(30_000);
  assert.deepEqual(controller.snapshot().complete.map(order => order.id), [2, 4, 1, 3]);
  assert.equal(controller.removeBot(), 1);
  assert.equal(controller.removeBot(), null);
});

test('two bots process separate orders concurrently', () => {
  const { controller, clock } = setup();
  controller.addOrder('Normal');
  controller.addOrder('Normal');
  controller.addBot();
  controller.addBot();
  assert.deepEqual(controller.snapshot().bots.map(bot => bot.orderId), [1, 2]);
  clock.advance(10_000);
  assert.deepEqual(controller.snapshot().complete.map(order => order.id), [1, 2]);
});

test('CLI accepts interactive commands from stdin', () => {
  const result = spawnSync(process.execPath, ['src/cli.js'], {
    cwd: require('node:path').join(__dirname, '..'),
    input: 'normal\nvip\nstatus\n+ bot\nstatus\n- bot\nstatus\nquit\n',
    encoding: 'utf8',
    timeout: 2_000
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /PENDING: #2 VIP \(PENDING\), #1 Normal \(PENDING\)/);
  assert.match(result.stdout, /Bot #1 started VIP Order #2/);
  assert.match(result.stdout, /Bot #1 stopped; VIP Order #2 returned to PENDING/);
});
