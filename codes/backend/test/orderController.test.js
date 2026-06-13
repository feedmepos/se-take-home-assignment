'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  OrderController,
  OrderType,
  OrderStatus,
  BotStatus,
} = require('../src/orderController');

/**
 * Minimal deterministic fake clock so tests never wait real time.
 * `tick(ms)` advances virtual time and fires any timers that come due.
 */
function createFakeClock() {
  let nowMs = 0;
  let seq = 0;
  let timers = [];

  return {
    now: () => nowMs,
    setTimeout: (fn, ms) => {
      const timer = { id: ++seq, at: nowMs + ms, fn };
      timers.push(timer);
      return timer;
    },
    clearTimeout: (timer) => {
      timers = timers.filter((t) => t !== timer);
    },
    tick(ms) {
      const target = nowMs + ms;
      // Fire due timers in chronological order until none remain before target.
      // Re-evaluated each loop because callbacks may schedule new timers.
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const due = timers
          .filter((t) => t.at <= target)
          .sort((a, b) => a.at - b.at);
        if (due.length === 0) break;
        const next = due[0];
        timers = timers.filter((t) => t !== next);
        nowMs = next.at;
        next.fn();
      }
      nowMs = target;
    },
  };
}

function makeController(processMs = 10000) {
  const clock = createFakeClock();
  const controller = new OrderController({
    processMs,
    now: clock.now,
    setTimeoutFn: clock.setTimeout,
    clearTimeoutFn: clock.clearTimeout,
  });
  return { controller, clock };
}

test('order numbers are unique and strictly increasing', () => {
  const { controller } = makeController();
  const a = controller.addNormalOrder();
  const b = controller.addVipOrder();
  const c = controller.addNormalOrder();
  assert.deepEqual([a.id, b.id, c.id], [1, 2, 3]);
});

test('new orders appear in the PENDING area', () => {
  const { controller } = makeController();
  controller.addNormalOrder();
  assert.equal(controller.pending.length, 1);
  assert.equal(controller.pending[0].status, OrderStatus.PENDING);
  assert.equal(controller.complete.length, 0);
});

test('VIP order is placed ahead of NORMAL but behind existing VIP', () => {
  const { controller } = makeController();
  const n1 = controller.addNormalOrder(); // #1 NORMAL
  const v2 = controller.addVipOrder();    // #2 VIP
  const v3 = controller.addVipOrder();    // #3 VIP
  const n4 = controller.addNormalOrder(); // #4 NORMAL

  // Expected order: VIP #2, VIP #3, NORMAL #1, NORMAL #4
  assert.deepEqual(
    controller.pending.map((o) => o.id),
    [v2.id, v3.id, n1.id, n4.id]
  );
});

test('a bot processes a pending order and completes it after processMs', () => {
  const { controller, clock } = makeController(10000);
  controller.addNormalOrder();
  controller.addBot();

  // Immediately picked up.
  assert.equal(controller.pending.length, 0);
  assert.equal(controller.bots[0].status, BotStatus.PROCESSING);

  // Not done before 10s.
  clock.tick(9999);
  assert.equal(controller.complete.length, 0);

  // Done at 10s.
  clock.tick(1);
  assert.equal(controller.complete.length, 1);
  assert.equal(controller.complete[0].status, OrderStatus.COMPLETE);
  assert.equal(controller.bots[0].status, BotStatus.IDLE);
});

test('VIP priority is honored across sequential processing', () => {
  const { controller, clock } = makeController(10000);
  controller.addNormalOrder(); // #1
  controller.addVipOrder();    // #2
  controller.addBot();

  // VIP #2 is processed first.
  assert.equal(controller.bots[0].order.id, 2);
  clock.tick(10000);
  assert.equal(controller.complete[0].id, 2);

  // Then NORMAL #1.
  assert.equal(controller.bots[0].order.id, 1);
  clock.tick(10000);
  assert.equal(controller.complete[1].id, 1);
});

test('a bot becomes IDLE when there is no pending order', () => {
  const { controller, clock } = makeController(10000);
  controller.addBot();
  assert.equal(controller.bots[0].status, BotStatus.IDLE);

  controller.addNormalOrder();
  assert.equal(controller.bots[0].status, BotStatus.PROCESSING);

  clock.tick(10000);
  assert.equal(controller.bots[0].status, BotStatus.IDLE);
});

test('two bots process two orders in parallel', () => {
  const { controller, clock } = makeController(10000);
  controller.addVipOrder();    // #1
  controller.addVipOrder();    // #2
  controller.addBot();         // -> #1
  controller.addBot();         // -> #2

  assert.equal(controller.pending.length, 0);
  clock.tick(10000);
  assert.equal(controller.complete.length, 2);
});

test('removing a bot returns its processing order to PENDING at correct position', () => {
  const { controller, clock } = makeController(10000);
  const v1 = controller.addVipOrder();    // #1 VIP
  const n2 = controller.addNormalOrder(); // #2 NORMAL
  controller.addBot();                    // bot1 -> VIP #1
  controller.addBot();                    // bot2 -> NORMAL #2

  assert.equal(controller.pending.length, 0);

  // Remove newest bot (bot2) mid-processing -> NORMAL #2 returns to pending.
  clock.tick(3000);
  controller.removeBot();

  assert.equal(controller.bots.length, 1);
  assert.deepEqual(controller.pending.map((o) => o.id), [n2.id]);
  assert.equal(controller.pending[0].status, OrderStatus.PENDING);

  // bot1 still finishing VIP #1.
  clock.tick(7000);
  assert.equal(controller.complete.map((o) => o.id).includes(v1.id), true);

  // bot1 now picks up the returned NORMAL #2.
  assert.equal(controller.bots[0].order.id, n2.id);
  clock.tick(10000);
  assert.equal(controller.complete.map((o) => o.id).includes(n2.id), true);
});

test('a returned VIP order keeps its priority ahead of normal orders', () => {
  const { controller, clock } = makeController(10000);
  const v1 = controller.addVipOrder();    // #1 VIP
  controller.addBot();                    // bot1 -> VIP #1
  const n2 = controller.addNormalOrder(); // #2 NORMAL (queued)

  clock.tick(2000);
  controller.removeBot();                 // VIP #1 returns to pending

  // VIP #1 must be ahead of NORMAL #2 again.
  assert.deepEqual(controller.pending.map((o) => o.id), [v1.id, n2.id]);
});

test('removing a bot with no bots present is a no-op', () => {
  const { controller } = makeController();
  assert.equal(controller.removeBot(), null);
});

test('decreasing a bot does not complete the in-progress order', () => {
  const { controller, clock } = makeController(10000);
  controller.addNormalOrder();
  controller.addBot();
  clock.tick(5000);
  controller.removeBot();

  // Order must NOT be completed; it goes back to pending.
  assert.equal(controller.complete.length, 0);
  assert.equal(controller.pending.length, 1);
});
