// test.js
const assert = require("assert");
const { OrderController } = require("./order-controller");

function testVipPriorityQueue() {
  const c = new OrderController({
    processingTimeSeconds: 5,
    logFn: () => {},
  });

  const n1 = c.createNormalOrder(); // 1
  const n2 = c.createNormalOrder(); // 2
  const v1 = c.createVipOrder(); // 3
  const v2 = c.createVipOrder(); // 4

  assert.deepStrictEqual(c.vipQueue, [v1, v2], "VIP queue order incorrect");
  assert.deepStrictEqual(
    c.normalQueue,
    [n1, n2],
    "Normal queue order incorrect"
  );
}

function testBotProcessesOrder() {
  const c = new OrderController({
    processingTimeSeconds: 3,
    logFn: () => {},
  });

  const id = c.createNormalOrder(); // 1
  c.addBot();

  c.runUntil(3);

  const snapshot = c.getSnapshot();
  assert.deepStrictEqual(
    snapshot.completedOrders,
    [id],
    "Order should be completed after 3s"
  );
  assert.strictEqual(snapshot.bots[0].status, "IDLE");
}

function testRemoveBusyBotReturnsOrderToPending() {
  const c = new OrderController({
    processingTimeSeconds: 10,
    logFn: () => {},
  });

  const v1 = c.createVipOrder(); // 1
  c.addBot(); // bot #1 picks up v1
  c.runUntil(3); // still processing

  c.removeBot(); // should put order back to VIP queue (PENDING)

  const snapshot = c.getSnapshot();
  const order = snapshot.orders.find((o) => o.id === v1);
  assert.strictEqual(order.status, "PENDING");
  assert.deepStrictEqual(snapshot.vipQueue, [v1]);
}

function runAll() {
  testVipPriorityQueue();
  testBotProcessesOrder();
  testRemoveBusyBotReturnsOrderToPending();
  console.log("All tests passed.");
}

if (require.main === module) {
  runAll();
}

module.exports = { runAll };
