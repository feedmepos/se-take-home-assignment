import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OrderController, type TimerHandle } from './order-controller.js';

// Controllable stand-in for setTimeout/clearTimeout so tests are instant and
// deterministic: completions only happen when the test calls flushAll().
class FakeScheduler {
  private queue: { id: number; cb: () => void }[] = [];
  private counter = 0;

  setTimeoutFn = (cb: () => void): TimerHandle => {
    const id = ++this.counter;
    this.queue.push({ id, cb });
    return id as unknown as TimerHandle;
  };

  clearTimeoutFn = (handle: TimerHandle): void => {
    const id = handle as unknown as number;
    this.queue = this.queue.filter((t) => t.id !== id);
  };

  private flushOnce(): void {
    const current = this.queue;
    this.queue = [];
    for (const t of current) t.cb();
  }

  flushAll(): void {
    let guard = 0;
    while (this.queue.length > 0 && guard++ < 1000) this.flushOnce();
  }

  get pendingTimers(): number {
    return this.queue.length;
  }
}

function makeController() {
  const scheduler = new FakeScheduler();
  const controller = new OrderController({
    processingMs: 10_000,
    setTimeoutFn: scheduler.setTimeoutFn,
    clearTimeoutFn: scheduler.clearTimeoutFn,
  });
  return { controller, scheduler };
}

const pendingIds = (c: OrderController) => c.pending.map((o) => o.id);
const completedIds = (c: OrderController) => c.completed.map((o) => o.id);

test('order ids are unique and strictly increasing', () => {
  const { controller } = makeController();
  const a = controller.newOrder('NORMAL');
  const b = controller.newOrder('VIP');
  const c = controller.newOrder('NORMAL');
  assert.deepEqual([a.id, b.id, c.id], [1001, 1002, 1003]);
});

test('VIP queues ahead of Normals but behind existing VIPs (FIFO within tier)', () => {
  const { controller } = makeController();
  controller.newOrder('NORMAL'); // #1001
  controller.newOrder('NORMAL'); // #1002
  controller.newOrder('VIP'); //    #1003
  controller.newOrder('VIP'); //    #1004
  controller.newOrder('NORMAL'); // #1005
  assert.deepEqual(pendingIds(controller), [1003, 1004, 1001, 1002, 1005]);
});

test('a bot picks up and completes an order after processing', () => {
  const { controller, scheduler } = makeController();
  controller.addBot();
  controller.newOrder('NORMAL');
  assert.equal(controller.pending.length, 0);
  assert.equal(controller.bots[0].status, 'PROCESSING');

  scheduler.flushAll();
  assert.deepEqual(completedIds(controller), [1001]);
  assert.equal(controller.bots[0].status, 'IDLE');
  assert.equal(controller.completed[0].status, 'COMPLETE');
});

test('adding a bot when orders are pending starts processing immediately', () => {
  const { controller } = makeController();
  controller.newOrder('VIP'); //    #1001
  controller.newOrder('NORMAL'); // #1002
  assert.deepEqual(pendingIds(controller), [1001, 1002]);

  controller.addBot();
  assert.equal(controller.bots[0].currentOrder?.id, 1001);
  assert.deepEqual(pendingIds(controller), [1002]);
});

test('with no pending orders a bot stays idle, then wakes on a new order', () => {
  const { controller } = makeController();
  controller.addBot();
  assert.equal(controller.bots[0].status, 'IDLE');

  controller.newOrder('NORMAL');
  assert.equal(controller.bots[0].status, 'PROCESSING');
  assert.equal(controller.bots[0].currentOrder?.id, 1001);
});

test('removing a bot mid-process cancels the timer and requeues by priority', () => {
  const { controller, scheduler } = makeController();
  controller.addBot();
  controller.newOrder('NORMAL'); // #1001 -> picked
  controller.newOrder('NORMAL'); // #1002 -> pending
  assert.equal(controller.bots[0].currentOrder?.id, 1001);

  controller.removeBot();

  assert.deepEqual(pendingIds(controller), [1001, 1002]);
  assert.equal(controller.bots.length, 0);

  scheduler.flushAll();
  assert.deepEqual(completedIds(controller), []); // no phantom completion
  assert.equal(scheduler.pendingTimers, 0);
});

test('requeue preserves arrival order even with multiple bots removed', () => {
  const { controller } = makeController();
  controller.addBot();
  controller.addBot();
  controller.newOrder('NORMAL'); // #1001 -> Bot #1
  controller.newOrder('NORMAL'); // #1002 -> Bot #2
  controller.newOrder('NORMAL'); // #1003 -> pending
  assert.deepEqual(pendingIds(controller), [1003]);

  controller.removeBot(); // returns #1002
  controller.removeBot(); // returns #1001

  assert.deepEqual(pendingIds(controller), [1001, 1002, 1003]);
});

test('removing an idle bot is a no-op for orders', () => {
  const { controller } = makeController();
  controller.addBot();
  controller.newOrder('NORMAL'); // #1001 -> processing
  controller.addBot(); //            Bot #2 idle

  controller.removeBot(); // removes idle Bot #2
  assert.equal(controller.bots.length, 1);
  assert.equal(controller.bots[0].currentOrder?.id, 1001);
  assert.deepEqual(pendingIds(controller), []);
});
