// test/orderController.test.js

const test = require("node:test");
const assert = require("assert");
const { OrderController } = require("../src/orderController");

// basic cases
test("VIP orders are queued ahead of normal orders", () => {
  const c = new OrderController();
  const n1 = c.createNormalOrder();
  const n2 = c.createNormalOrder();
  const v1 = c.createVipOrder();

  const vipIds = c.pendingVip.map((o) => o.id);
  const normalIds = c.pendingNormal.map((o) => o.id);

  assert.deepStrictEqual(vipIds, [v1.id]);
  assert.deepStrictEqual(normalIds, [n1.id, n2.id]);
});

test("bot processes an order and completes after 10 seconds", () => {
  const c = new OrderController(10);
  const order = c.createNormalOrder();
  c.addBot(); // at t=0, bot picks the order

  c.advanceTimeTo(10);

  const stored = c.orders.get(order.id);
  assert.strictEqual(stored.status, "COMPLETE");
});

test("removing newest busy bot returns its order to pending", () => {
  const c = new OrderController(10);

  const n1 = c.createNormalOrder(); // id 1
  const n2 = c.createNormalOrder(); // id 2

  c.addBot(); // Bot #1 picks n1
  c.addBot(); // Bot #2 picks n2

  // Remove newest bot (Bot #2) while BUSY
  c.removeBot();

  // Order n2 should be back in pendingNormal at the front
  const pendingNormalIds = c.pendingNormal.map((o) => o.id);
  assert.deepStrictEqual(pendingNormalIds, [n2.id]);

  // n1 is still being processed by Bot #1
  const order1 = c.orders.get(n1.id);
  assert.strictEqual(order1.status, "PROCESSING");
});

// Edge cases
test("removing a bot when there are no bots is a no-op", () => {
  const c = new OrderController();

  // No bots exist
  assert.strictEqual(c.bots.length, 0);

  const removed = c.removeBot();
  assert.strictEqual(removed, null);
  assert.strictEqual(c.bots.length, 0);

  // Should not throw and logs should contain the message
  const logContains = c.getLogs().some((line) =>
    line.includes("No bots to remove")
  );
  assert.ok(logContains, "Expected 'No bots to remove' log entry");
});

test("advancing time with no bots and pending orders does not change order status", () => {
  const c = new OrderController();

  const n1 = c.createNormalOrder();
  const v1 = c.createVipOrder();

  // No bots added at all
  assert.strictEqual(c.bots.length, 0);

  c.advanceTimeTo(100); // time passes, but no one processes anything

  const orderN1 = c.orders.get(n1.id);
  const orderV1 = c.orders.get(v1.id);

  assert.strictEqual(orderN1.status, "PENDING");
  assert.strictEqual(orderV1.status, "PENDING");
});

test("advancing time to the same value is a no-op", () => {
  const c = new OrderController(10);

  c.createNormalOrder();
  c.addBot(); // picks up that order at t=0

  c.advanceTimeTo(0); // no change in time

  // Bot should still be busy, order still processing
  const bot = c.bots[0];
  assert.strictEqual(bot.status, "BUSY");

  const order = c.orders.get(1);
  assert.strictEqual(order.status, "PROCESSING");
});

test("advancing time backwards throws an error", () => {
  const c = new OrderController(10);

  c.createNormalOrder();
  c.addBot(); // at t=0
  c.advanceTimeTo(5); // move forward first

  assert.throws(
    () => c.advanceTimeTo(3),
    /Cannot go back in time/,
    "Expected error when moving time backwards"
  );
});

test("idle bot picks up new order immediately when order is created later", () => {
  const c = new OrderController(10);

  // Add a bot when there are no orders
  c.addBot();
  assert.strictEqual(c.bots.length, 1);
  assert.strictEqual(c.bots[0].status, "IDLE");

  // Move time a bit, still idle
  c.advanceTimeTo(5);
  assert.strictEqual(c.bots[0].status, "IDLE");

  // Now create an order; existing idle bot should pick it up immediately
  const order = c.createNormalOrder();

  const bot = c.bots[0];
  assert.strictEqual(bot.status, "BUSY");
  assert.strictEqual(bot.currentOrderId, order.id);

  const stored = c.orders.get(order.id);
  assert.strictEqual(stored.status, "PROCESSING");
  assert.strictEqual(stored.assignedBotId, bot.id);
  assert.strictEqual(stored.startedAt, c.timeSec); // picked at current time
});

test("busy bot's requeued order is processed before a later order of the same type", () => {
  const c = new OrderController(10);

  // Two normal orders
  const n1 = c.createNormalOrder(); // id 1
  const n2 = c.createNormalOrder(); // id 2

  // Two bots
  c.addBot(); // Bot #1 picks n1
  c.addBot(); // Bot #2 picks n2

  // Remove newest busy bot: Bot #2; n2 should go back to pendingNormal front
  c.removeBot();

  // Now create a later normal order n3
  const n3 = c.createNormalOrder(); // id 3

  // Pending normals should be [n2, n3]
  const pendingNormalIds = c.pendingNormal.map((o) => o.id);
  assert.deepStrictEqual(pendingNormalIds, [n2.id, n3.id]);

  // When Bot #1 finishes n1 and becomes idle, it should pick n2 before n3
  c.advanceTimeTo(10); // complete n1, Bot #1 becomes idle then picks next

  const order2 = c.orders.get(n2.id);
  const order3 = c.orders.get(n3.id);

  assert.strictEqual(order2.status, "PROCESSING");
  assert.strictEqual(order3.status, "PENDING");
});

test("multiple completions at the same time are handled correctly", () => {
  const c = new OrderController(10);

  // Three orders
  const o1 = c.createNormalOrder();
  const o2 = c.createVipOrder();
  const o3 = c.createNormalOrder();

  // Three bots
  c.addBot(); // Bot #1 picks VIP (o2)
  c.addBot(); // Bot #2 picks o1
  c.addBot(); // Bot #3 picks o3

  // All started at t=0, all should complete at t=10 together
  c.advanceTimeTo(10);

  const s1 = c.orders.get(o1.id);
  const s2 = c.orders.get(o2.id);
  const s3 = c.orders.get(o3.id);

  assert.strictEqual(s1.status, "COMPLETE");
  assert.strictEqual(s2.status, "COMPLETE");
  assert.strictEqual(s3.status, "COMPLETE");

  // All bots should be idle
  for (const bot of c.bots) {
    assert.strictEqual(bot.status, "IDLE");
    assert.strictEqual(bot.currentOrderId, null);
    assert.strictEqual(bot.busyUntil, null);
  }
});
