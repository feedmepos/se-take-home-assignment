'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { OrderController } = require('../src/orderController');

/** Deterministic, fast stand-in for setTimeout so tests need no real waiting. */
class FakeScheduler {
  constructor() {
    this.time = 0;
    this.seq = 1;
    this.tasks = [];
  }

  setTimeout = (fn, ms) => {
    const id = this.seq++;
    this.tasks.push({ id, fn, at: this.time + ms });
    return id;
  };

  clearTimeout = (id) => {
    this.tasks = this.tasks.filter((t) => t.id !== id);
  };

  /** Advance virtual time, firing due timers in order (re-sorting as new ones are scheduled). */
  advance(ms) {
    const target = this.time + ms;
    for (;;) {
      this.tasks.sort((a, b) => a.at - b.at);
      if (this.tasks.length === 0 || this.tasks[0].at > target) break;
      const task = this.tasks.shift();
      this.time = task.at;
      task.fn();
    }
    this.time = target;
  }
}

function makeController() {
  const scheduler = new FakeScheduler();
  const controller = new OrderController({
    processingMs: 10000,
    setTimeoutFn: scheduler.setTimeout,
    clearTimeoutFn: scheduler.clearTimeout,
    now: () => new Date(scheduler.time),
  });
  return { controller, scheduler };
}

const ids = (orders) => orders.map((o) => o.id);

test('new normal order lands in PENDING', () => {
  const { controller } = makeController();
  controller.newNormalOrder();
  assert.equal(controller.pending.length, 1);
  assert.equal(controller.pending[0].type, 'NORMAL');
  assert.equal(controller.pending[0].status, 'PENDING');
});

test('order numbers are unique and increasing', () => {
  const { controller } = makeController();
  const a = controller.newNormalOrder();
  const b = controller.newVipOrder();
  const c = controller.newNormalOrder();
  assert.deepEqual([a.id, b.id, c.id], [1, 2, 3]);
});

test('VIP order queues in front of normals but behind earlier VIPs', () => {
  const { controller } = makeController();
  controller.newNormalOrder(); // #1 NORMAL
  controller.newVipOrder(); //    #2 VIP
  controller.newNormalOrder(); // #3 NORMAL
  controller.newVipOrder(); //    #4 VIP
  // Expected queue: VIP#2, VIP#4, NORMAL#1, NORMAL#3
  assert.deepEqual(ids(controller.pending), [2, 4, 1, 3]);
});

test('a bot processes an order and completes it after 10s', () => {
  const { controller, scheduler } = makeController();
  controller.newNormalOrder();
  controller.addBot();
  assert.equal(controller.bots[0].status, 'PROCESSING');
  assert.equal(controller.complete.length, 0);

  scheduler.advance(10000);
  assert.equal(controller.complete.length, 1);
  assert.equal(controller.complete[0].status, 'COMPLETE');
  assert.equal(controller.bots[0].status, 'IDLE');
});

test('bot becomes IDLE when no pending orders remain', () => {
  const { controller, scheduler } = makeController();
  controller.addBot();
  assert.equal(controller.bots[0].status, 'IDLE');
  controller.newNormalOrder();
  scheduler.advance(10000);
  assert.equal(controller.bots[0].status, 'IDLE');
  assert.equal(controller.pending.length, 0);
});

test('bot processes orders one after another in priority order', () => {
  const { controller, scheduler } = makeController();
  controller.newNormalOrder(); // #1
  controller.newVipOrder(); //    #2
  controller.addBot();
  assert.equal(controller.bots[0].currentOrder.id, 2); // VIP first
  scheduler.advance(10000);
  assert.equal(controller.complete[0].id, 2);
  assert.equal(controller.bots[0].currentOrder.id, 1); // then normal
  scheduler.advance(10000);
  assert.deepEqual(ids(controller.complete), [2, 1]);
});

test('adding a bot immediately processes a pending order', () => {
  const { controller } = makeController();
  controller.newNormalOrder();
  assert.equal(controller.pending.length, 1);
  controller.addBot();
  assert.equal(controller.pending.length, 0);
  assert.equal(controller.bots[0].status, 'PROCESSING');
});

test('removing the newest bot returns its order to the correct queue position', () => {
  const { controller, scheduler } = makeController();
  controller.newVipOrder(); //    #1 VIP -> picked up by the bot
  controller.newNormalOrder(); // #2 NORMAL
  controller.newVipOrder(); //    #3 VIP
  controller.addBot();
  assert.equal(controller.bots[0].currentOrder.id, 1);
  assert.deepEqual(ids(controller.pending), [3, 2]); // VIP#3, NORMAL#2

  controller.removeBot();
  // VIP#1 returns ahead of VIP#3 (older id) and both VIPs precede NORMAL#2.
  assert.deepEqual(ids(controller.pending), [1, 3, 2]);
  assert.equal(controller.pending[0].status, 'PENDING');
  assert.equal(controller.bots.length, 0);
  scheduler.advance(10000);
  assert.equal(controller.complete.length, 0); // bot destroyed mid-process
});

test('removeBot destroys the newest bot only', () => {
  const { controller } = makeController();
  controller.addBot(); // #1
  controller.addBot(); // #2
  controller.removeBot();
  assert.deepEqual(
    controller.bots.map((b) => b.id),
    [1]
  );
});

test('a second bot lets two orders process in parallel', () => {
  const { controller, scheduler } = makeController();
  controller.newNormalOrder();
  controller.newNormalOrder();
  controller.addBot();
  controller.addBot();
  assert.equal(controller.pending.length, 0);
  scheduler.advance(10000);
  assert.equal(controller.complete.length, 2);
});
