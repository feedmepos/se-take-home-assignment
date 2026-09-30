'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const { OrderController, PROCESSING_MS } = require('../src/order-controller');

function fakeClock() {
  let now = 0;
  let nextId = 1;
  const timers = new Map();
  return {
    now: () => now,
    setTimer(callback, delay) {
      const id = nextId++;
      timers.set(id, { at: now + delay, callback });
      return id;
    },
    clearTimer: id => timers.delete(id),
    advance(ms) {
      const target = now + ms;
      while (true) {
        const due = [...timers].sort((a, b) => a[1].at - b[1].at || a[0] - b[0])
          .find(([, timer]) => timer.at <= target);
        if (!due) break;
        now = due[1].at;
        timers.delete(due[0]);
        due[1].callback();
      }
      now = target;
    }
  };
}

function setup() {
  const clock = fakeClock();
  const lines = [];
  return { clock, lines, controller: new OrderController({ ...clock, log: line => lines.push(line) }) };
}

test('order IDs increase and pending orders retain VIP then normal FIFO order', () => {
  const { controller } = setup();
  for (const type of ['Normal', 'VIP', 'Normal', 'VIP']) controller.addOrder(type);
  assert.deepEqual(controller.getState().pending.map(order => order.id), [2, 4, 1, 3]);
  assert.deepEqual(controller.getState().pending.map(order => order.status), Array(4).fill('PENDING'));
  assert.throws(() => controller.addOrder('Unknown'), /Order type/);
  assert.equal(controller.addOrder('Normal'), 5);
});

test('one bot processes one order for exactly ten seconds, picks the next, then idles', () => {
  const { controller, clock, lines } = setup();
  const botId = controller.addBot();
  assert.equal(botId, 1);
  assert.equal(controller.getState().bots[0].status, 'IDLE');
  controller.addOrder('Normal');
  controller.addOrder('Normal');
  controller.addOrder('VIP');
  assert.deepEqual(controller.getState().processing.map(order => order.orderId), [1]);
  assert.deepEqual(controller.getState().pending.map(order => order.id), [3, 2]);
  clock.advance(PROCESSING_MS - 1);
  assert.equal(controller.getState().complete.length, 0);
  clock.advance(1);
  assert.deepEqual(controller.getState().complete.map(order => order.id), [1]);
  assert.deepEqual(controller.getState().processing.map(order => order.orderId), [3]);
  clock.advance(PROCESSING_MS * 2);
  assert.deepEqual(controller.getState().complete.map(order => order.id), [1, 3, 2]);
  assert.equal(controller.getState().bots[0].status, 'IDLE');
  assert.ok(lines.every(line => /^\[\d{2}:\d{2}:\d{2}\] /.test(line)));
  assert.ok(lines.some(line => line.startsWith('[00:00:10] Bot #1 completed')));
});

test('removing newest busy bot requeues its order by priority and cancels completion', () => {
  const { controller, clock } = setup();
  for (const type of ['Normal', 'VIP', 'Normal', 'VIP']) controller.addOrder(type);
  assert.equal(controller.addBot(), 1);
  assert.equal(controller.addBot(), 2);
  assert.deepEqual(controller.getState().processing.map(order => order.orderId), [2, 4]);
  clock.advance(5_000);
  assert.equal(controller.removeBot(), 2);
  assert.deepEqual(controller.getState().processing.map(order => order.orderId), [2]);
  assert.deepEqual(controller.getState().pending.map(order => order.id), [4, 1, 3]);
  controller.addOrder('VIP');
  assert.deepEqual(controller.getState().pending.map(order => order.id), [4, 5, 1, 3]);
  clock.advance(5_000);
  assert.deepEqual(controller.getState().complete.map(order => order.id), [2]);
  assert.deepEqual(controller.getState().processing.map(order => order.orderId), [4]);
});

test('canceled work restarts its full ten seconds when a new bot takes it', () => {
  const { controller, clock } = setup();
  controller.addOrder('Normal');
  controller.addBot();
  clock.advance(9_000);
  controller.removeBot();
  assert.deepEqual(controller.getState().pending.map(order => order.id), [1]);
  controller.addBot();
  clock.advance(9_999);
  assert.equal(controller.getState().complete.length, 0);
  clock.advance(1);
  assert.deepEqual(controller.getState().complete.map(order => order.id), [1]);
  assert.equal(controller.getState().bots[0].id, 2);
});

test('removing an idle bot and removing from an empty fleet are safe', () => {
  const { controller } = setup();
  controller.addBot();
  assert.equal(controller.removeBot(), 1);
  assert.equal(controller.removeBot(), null);
  assert.deepEqual(controller.getState().bots, []);
});

test('interactive CLI accepts commands and prints timestamped status', () => {
  const result = spawnSync(process.execPath, ['src/cli.js'], {
    cwd: require('node:path').join(__dirname, '..'),
    input: 'normal\nvip\nstatus\n+\nstatus\n-\nstatus\nquit\n',
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /PENDING: #2 VIP, #1 Normal/);
  assert.match(result.stdout, /PROCESSING: #2 VIP by Bot #1/);
  assert.match(result.stdout, /Bot #1 stopped; VIP Order #2 returned to PENDING/);
  assert.ok(result.stdout.trimEnd().split('\n').every(line => /^\[\d{2}:\d{2}:\d{2}\] /.test(line)));
});
