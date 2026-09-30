'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { OrderController } = require('../src/controller');

function setup() {
  let time = 0;
  let nextTimer = 1;
  const timers = new Map();
  const events = [];
  const controller = new OrderController({
    now: () => new Date(time),
    setTimer: (callback, delay) => {
      const id = nextTimer++;
      timers.set(id, { at: time + delay, callback });
      return id;
    },
    clearTimer: id => timers.delete(id),
    onEvent: event => events.push(event)
  });
  function advance(ms) {
    const end = time + ms;
    while (true) {
      const due = [...timers].filter(([, timer]) => timer.at <= end)
        .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!due) break;
      timers.delete(due[0]);
      time = due[1].at;
      due[1].callback();
    }
    time = end;
  }
  return { controller, advance, events };
}

const ids = orders => orders.map(order => order.id);

test('VIP orders lead the pending queue and IDs always increase', () => {
  const { controller: c } = setup();
  assert.deepEqual([
    c.addOrder('NORMAL'), c.addOrder('VIP'), c.addOrder('NORMAL'),
    c.addOrder('VIP'), c.addOrder('NORMAL')
  ], [1, 2, 3, 4, 5]);
  assert.deepEqual(ids(c.getState().pending), [2, 4, 1, 3, 5]);
  assert.throws(() => c.addOrder('OTHER'));
});

test('one bot processes one order for exactly ten seconds, then picks the next', () => {
  const { controller: c, advance, events } = setup();
  c.addOrder('NORMAL');
  c.addOrder('VIP');
  c.addBot();
  assert.deepEqual(ids(c.getState().pending), [1]);
  assert.equal(c.getState().processing[0].order.id, 2);
  advance(9_999);
  assert.deepEqual(c.getState().complete, []);
  advance(1);
  assert.deepEqual(ids(c.getState().complete), [2]);
  assert.equal(c.getState().processing[0].order.id, 1);
  advance(10_000);
  assert.deepEqual(ids(c.getState().complete), [2, 1]);
  assert.equal(c.getState().bots[0].status, 'IDLE');
  assert.equal(events.find(event => event.message.includes('completed VIP')).time.getTime(), 10_000);
  c.addOrder('VIP');
  assert.equal(c.getState().processing[0].order.id, 3);
});

test('a cancelled order returns to its original place and never completes early', () => {
  const { controller: c, advance } = setup();
  c.addOrder('NORMAL'); // 1
  c.addOrder('VIP'); // 2
  c.addOrder('VIP'); // 3
  c.addBot(); // 2
  c.addBot(); // 3
  advance(4_000);
  c.removeNewestBot();
  c.addOrder('VIP'); // 4
  assert.deepEqual(ids(c.getState().pending), [3, 4, 1]);
  advance(6_000);
  assert.deepEqual(ids(c.getState().complete), [2]);
  assert.equal(c.getState().processing[0].order.id, 3);
  advance(9_999);
  assert.deepEqual(ids(c.getState().complete), [2]);
  advance(1);
  assert.deepEqual(ids(c.getState().complete), [2, 3]);
});

test('newest bot is removed, whether busy or idle', () => {
  const { controller: c, advance } = setup();
  assert.equal(c.removeNewestBot(), null);
  c.addBot();
  c.addBot();
  c.addOrder('NORMAL');
  assert.deepEqual(c.getState().bots.map(bot => bot.id), [1, 2]);
  assert.equal(c.removeNewestBot(), 2);
  assert.equal(c.getState().processing[0].botId, 1);
  assert.equal(c.removeNewestBot(), 1);
  assert.deepEqual(ids(c.getState().pending), [1]);
  advance(20_000);
  assert.deepEqual(c.getState().complete, []);
  c.addBot();
  assert.equal(c.getState().processing[0].botId, 3);
});

test('several bots work concurrently and never share an order', () => {
  const { controller: c, advance } = setup();
  for (let i = 0; i < 3; i++) c.addOrder('NORMAL');
  c.addBot();
  c.addBot();
  assert.deepEqual(c.getState().processing.map(item => item.order.id), [1, 2]);
  advance(10_000);
  assert.deepEqual(ids(c.getState().complete), [1, 2]);
  assert.deepEqual(c.getState().processing.map(item => item.order.id), [3]);
  advance(10_000);
  assert.deepEqual(ids(c.getState().complete), [1, 2, 3]);
});
