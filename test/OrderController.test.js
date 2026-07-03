import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OrderController } from '../src/OrderController.js';
import { OrderType, OrderStatus, BotStatus, PROCESS_MS } from '../src/constants.js';
import { createVirtualClock } from '../src/virtualClock.js';

function makeController() {
  const clock = createVirtualClock();
  const controller = new OrderController({
    scheduler: clock.scheduler,
    now: clock.now,
  });
  return { controller, advance: clock.advance };
}

// Requirement #1: new normal order lands in PENDING.
test('new normal order appears in PENDING', () => {
  const { controller } = makeController();
  const order = controller.newNormalOrder();
  assert.equal(order.type, OrderType.NORMAL);
  assert.equal(order.status, OrderStatus.PENDING);
  assert.deepEqual(
    controller.snapshot().pending.map((o) => o.number),
    [1001],
  );
});

// Requirement #3: order numbers are unique and increasing.
test('order numbers are unique and increasing', () => {
  const { controller } = makeController();
  const a = controller.newNormalOrder();
  const b = controller.newVipOrder();
  const c = controller.newNormalOrder();
  assert.deepEqual([a.number, b.number, c.number], [1001, 1002, 1003]);
});

// Requirement #2: VIP sits ahead of Normal but behind existing VIPs.
test('VIP order queues ahead of Normal, behind existing VIP', () => {
  const { controller } = makeController();
  controller.newNormalOrder(); // #1001 Normal
  controller.newVipOrder();    // #1002 VIP
  controller.newNormalOrder(); // #1003 Normal
  controller.newVipOrder();    // #1004 VIP

  // Expected PENDING order: VIP#1002, VIP#1004, Normal#1001, Normal#1003
  assert.deepEqual(
    controller.snapshot().pending.map((o) => o.number),
    [1002, 1004, 1001, 1003],
  );
});

// Requirement #4: adding a bot immediately starts processing the front order.
test('adding a bot starts processing the front pending order', () => {
  const { controller } = makeController();
  controller.newNormalOrder(); // #1001
  controller.newVipOrder();    // #1002 (front)
  const bot = controller.addBot();

  assert.equal(bot.status, BotStatus.PROCESSING);
  assert.equal(bot.order.number, 1002); // VIP picked first
  assert.equal(controller.snapshot().pending.length, 1);
});

// Requirement #4: order completes after 10s and bot picks the next one.
test('order completes after PROCESS_MS and bot continues', () => {
  const { controller, advance } = makeController();
  controller.newVipOrder();    // #1001
  controller.newNormalOrder(); // #1002
  controller.addBot();

  advance(PROCESS_MS);
  let snap = controller.snapshot();
  assert.deepEqual(snap.completed.map((o) => o.number), [1001]);
  assert.equal(snap.bots[0].order.number, 1002); // moved on to next

  advance(PROCESS_MS);
  snap = controller.snapshot();
  assert.deepEqual(snap.completed.map((o) => o.number), [1001, 1002]);
});

// Requirement #5: bot goes IDLE when there is nothing left to process.
test('bot becomes IDLE when no pending orders remain', () => {
  const { controller, advance } = makeController();
  controller.newNormalOrder();
  controller.addBot();
  advance(PROCESS_MS);

  const snap = controller.snapshot();
  assert.equal(snap.bots[0].status, BotStatus.IDLE);
  assert.equal(snap.bots[0].order, null);
  assert.equal(snap.pending.length, 0);
});

// Requirement #6: removing a busy bot returns its order to the right spot.
test('removing a processing bot returns the order to PENDING in order', () => {
  const { controller } = makeController();
  controller.newVipOrder();    // #1001 VIP
  controller.newNormalOrder(); // #1002 Normal
  const bot = controller.addBot(); // starts VIP #1001

  assert.equal(bot.order.number, 1001);

  controller.removeBot(); // destroy the busy bot

  // #1001 (VIP) must return AHEAD of #1002 (Normal).
  assert.deepEqual(
    controller.snapshot().pending.map((o) => o.number),
    [1001, 1002],
  );
  assert.equal(controller.snapshot().bots.length, 0);
});

// Requirement #6: a remaining bot picks up the returned order.
test('returned order is picked up by a remaining bot', () => {
  const { controller } = makeController();
  controller.newVipOrder(); // #1001
  controller.addBot();      // bot #1 -> processing #1001
  controller.addBot();      // bot #2 -> idle (nothing else pending)

  controller.removeBot();   // removes newest (bot #2, idle) -> no effect on order
  assert.equal(controller.snapshot().bots.length, 1);
  assert.equal(controller.snapshot().bots[0].order.number, 1001);
});

// Removing an idle bot leaves orders untouched.
test('removing an idle bot does not affect processing', () => {
  const { controller } = makeController();
  controller.newNormalOrder();
  controller.addBot(); // busy
  controller.addBot(); // idle
  controller.removeBot(); // remove the idle one (newest)

  const snap = controller.snapshot();
  assert.equal(snap.bots.length, 1);
  assert.equal(snap.bots[0].status, BotStatus.PROCESSING);
});
