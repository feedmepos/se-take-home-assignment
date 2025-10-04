const assert = require("assert");
const OrderManager = require("../src/orderManager");

console.log("\n🔶 Running OrderManager tests...");

const om = new OrderManager();

// Create orders
const o1 = om.createOrder("NORMAL");
const o2 = om.createOrder("VIP");
const o3 = om.createOrder("NORMAL");
const o4 = om.createOrder("VIP");

// Test order IDs increase
assert.strictEqual(o1.id < o2.id, true, "Order IDs should increase");

// VIP orders appear before NORMALs
const orderSequence = om.pending.map((o) => o.type);
assert.deepStrictEqual(
  orderSequence,
  ["VIP", "VIP", "NORMAL", "NORMAL"],
  "VIP orders should come first"
);

// Test getNextOrder
const first = om.getNextOrder();
assert.strictEqual(first.type, "VIP", "First pulled order must be VIP");

// Move to complete
om.moveToComplete(first);
assert.strictEqual(om.complete.length, 1, "Completed orders should increase");

// Return to pending
const o5 = om.createOrder("NORMAL");
om.returnToPending(o5);
assert.strictEqual(
  om.pending[0].id,
  o5.id,
  "Returned order should be at front"
);
