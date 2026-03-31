import test from 'node:test';
import assert from 'node:assert/strict';
import { OrderSystem } from '../src/orderSystem.js';

function createFakeTimer() {
  const timers = [];
  return {
    timers,
    setTimer(fn, ms) {
      const item = { fn, ms, canceled: false };
      timers.push(item);
      return item;
    },
    clearTimer(timer) {
      timer.canceled = true;
    },
    runNext() {
      const next = timers.find((t) => !t.canceled && !t.ran);
      if (!next) throw new Error('no timer to run');
      next.ran = true;
      next.fn();
    },
    runAll() {
      while (timers.some((t) => !t.canceled && !t.ran)) {
        this.runNext();
      }
    },
  };
}

test('VIP orders are queued ahead of normal orders and preserve FIFO within group', () => {
  const fakeNow = () => new Date('2026-03-31T10:00:00.000Z');
  const timers = createFakeTimer();
  const system = new OrderSystem({ orderDurationMs: 1000, now: fakeNow, setTimer: timers.setTimer.bind(timers), clearTimer: timers.clearTimer.bind(timers) });

  system.addOrder('normal');
  system.addOrder('vip');
  system.addOrder('vip');
  system.addOrder('normal');

  assert.deepEqual(system.listPending().map((o) => o.id), [2, 3, 1, 4]);
});

test('robot processes one order at a time and completes it', () => {
  let current = new Date('2026-03-31T10:00:00.000Z');
  const timers = createFakeTimer();
  const system = new OrderSystem({
    orderDurationMs: 1000,
    now: () => current,
    setTimer: timers.setTimer.bind(timers),
    clearTimer: timers.clearTimer.bind(timers),
  });

  system.addRobot();
  system.addOrder('vip');
  assert.equal(system.getSnapshot().robots[0].status, 'WORKING');
  assert.equal(system.getSnapshot().pending.length, 0);

  current = new Date('2026-03-31T10:00:10.000Z');
  timers.runAll();
  assert.equal(system.listCompleted()[0].status, 'DONE');
  assert.equal(system.getSnapshot().robots[0].status, 'IDLE');
});

test('removing a working robot rolls back its order into the correct position', () => {
  let current = new Date('2026-03-31T10:00:00.000Z');
  const timers = createFakeTimer();
  const system = new OrderSystem({
    orderDurationMs: 1000,
    now: () => current,
    setTimer: timers.setTimer.bind(timers),
    clearTimer: timers.clearTimer.bind(timers),
  });

  system.addRobot();
  system.addRobot();
  system.addOrder('normal'); // id 1
  system.addOrder('vip');    // id 2, gets processed by robot 1
  system.addOrder('normal'); // id 3

  assert.equal(system.getSnapshot().robots[0].currentOrderId, 2);
  system.removeRobot(); // removes newest robot (robot 2), idle
  assert.deepEqual(system.listPending().map((o) => o.id), [1, 3]);

  // now remove the working robot by removing again
  system.removeRobot();
  assert.deepEqual(system.listPending().map((o) => o.id), [2, 1, 3]);
  assert.equal(system.listPending()[0].status, 'PENDING');
});

