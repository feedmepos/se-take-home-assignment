import { OrderService } from "./services/order.service";

// Simple assertion helper
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`❌ FAILED: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(
      `❌ FAILED: ${message}\n   Expected: ${expected}\n   Actual: ${actual}`
    );
  }
}

function assertNotEqual<T>(actual: T, expected: T, message: string): void {
  if (actual === expected) {
    throw new Error(`❌ FAILED: ${message}\n   Should not equal: ${expected}`);
  }
}

function assertDefined<T>(
  value: T | undefined | null,
  message: string
): asserts value is T {
  if (value === undefined || value === null) {
    throw new Error(`❌ FAILED: ${message}\n   Value is ${value}`);
  }
}

function assertUndefined(value: any, message: string): void {
  if (value !== undefined) {
    throw new Error(
      `❌ FAILED: ${message}\n   Expected undefined but got: ${value}`
    );
  }
}

// Test runner
let passedTests = 0;
let failedTests = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✅ ${name}`);
    passedTests++;
  } catch (error) {
    console.error(`❌ ${name}`);
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    }
    failedTests++;
  }
}

console.log("\n🧪 Running OrderService Tests...\n");

// Test: Create Normal Order
test("should create a normal order", () => {
  const orderService = new OrderService();
  const order = orderService.createOrder("NORMAL");
  assertDefined(order, "Order should be defined");
  assertEqual(order.type, "NORMAL", "Order type should be NORMAL");
  assertEqual(order.status, "PENDING", "Order status should be PENDING");
  assert(order.id > 1000, "Order ID should be greater than 1000");
});

// Test: Create VIP Order
test("should create a VIP order", () => {
  const orderService = new OrderService();
  const order = orderService.createOrder("VIP");
  assertDefined(order, "Order should be defined");
  assertEqual(order.type, "VIP", "Order type should be VIP");
  assertEqual(order.status, "PENDING", "Order status should be PENDING");
});

// Test: Generate Unique IDs
test("should generate unique order IDs", () => {
  const orderService = new OrderService();
  const order1 = orderService.createOrder("NORMAL");
  const order2 = orderService.createOrder("NORMAL");
  assertNotEqual(order1.id, order2.id, "Order IDs should be different");
  assertEqual(order2.id, order1.id + 1, "Order IDs should increment by 1");
});

// Test: VIP Priority
test("should return VIP orders before normal orders", () => {
  const orderService = new OrderService();
  const normalOrder = orderService.createOrder("NORMAL");
  const vipOrder = orderService.createOrder("VIP");
  const nextOrder = orderService.getNextPendingOrder();
  assertDefined(nextOrder, "Next order should be defined");
  assertEqual(nextOrder.id, vipOrder.id, "VIP order should be returned first");
});

// Test: Return Normal Order
test("should return normal order when no VIP orders exist", () => {
  const orderService = new OrderService();
  const normalOrder = orderService.createOrder("NORMAL");
  const nextOrder = orderService.getNextPendingOrder();
  assertDefined(nextOrder, "Next order should be defined");
  assertEqual(nextOrder.id, normalOrder.id, "Normal order should be returned");
});

// Test: No Orders
test("should return undefined when no orders exist", () => {
  const orderService = new OrderService();
  const nextOrder = orderService.getNextPendingOrder();
  assertUndefined(nextOrder, "Should return undefined when no orders exist");
});

// Test: Multiple VIP Priority
test("should maintain VIP priority with multiple orders", () => {
  const orderService = new OrderService();
  orderService.createOrder("NORMAL");
  orderService.createOrder("VIP");
  orderService.createOrder("NORMAL");
  orderService.createOrder("VIP");

  const order1 = orderService.getNextPendingOrder();
  const order2 = orderService.getNextPendingOrder();
  const order3 = orderService.getNextPendingOrder();
  const order4 = orderService.getNextPendingOrder();

  assertDefined(order1, "Order 1 should be defined");
  assertDefined(order2, "Order 2 should be defined");
  assertDefined(order3, "Order 3 should be defined");
  assertDefined(order4, "Order 4 should be defined");

  assertEqual(order1.type, "VIP", "First order should be VIP");
  assertEqual(order2.type, "VIP", "Second order should be VIP");
  assertEqual(order3.type, "NORMAL", "Third order should be NORMAL");
  assertEqual(order4.type, "NORMAL", "Fourth order should be NORMAL");
});

// Test: Add to Processing
test("should add order to processing list", () => {
  const orderService = new OrderService();
  const order = orderService.createOrder("NORMAL");
  const dequeuedOrder = orderService.getNextPendingOrder();

  assertDefined(dequeuedOrder, "Dequeued order should be defined");
  dequeuedOrder.status = "PROCESSING";
  dequeuedOrder.botId = 1;
  orderService.addToProcessing(dequeuedOrder);

  const processingOrders = orderService.getProcessingOrders();
  assertEqual(processingOrders.length, 1, "Should have 1 processing order");
  assertEqual(
    processingOrders[0].status,
    "PROCESSING",
    "Order status should be PROCESSING"
  );
});

// Test: Remove from Pending
test("should remove order from pending queue when dequeued", () => {
  const orderService = new OrderService();
  orderService.createOrder("NORMAL");
  orderService.getNextPendingOrder();

  const pendingOrders = orderService.getPendingOrders();
  assertEqual(pendingOrders.length, 0, "Pending queue should be empty");
});

// Test: Mark Complete
test("should mark order as complete", () => {
  const orderService = new OrderService();
  const order = orderService.createOrder("NORMAL");
  const dequeuedOrder = orderService.getNextPendingOrder();
  assertDefined(dequeuedOrder, "Dequeued order should be defined");
  dequeuedOrder.status = "PROCESSING";
  orderService.addToProcessing(dequeuedOrder);

  const completedOrder = orderService.markOrderAsComplete(dequeuedOrder.id);

  assertDefined(completedOrder, "Completed order should be defined");
  assertEqual(
    completedOrder.status,
    "COMPLETE",
    "Order status should be COMPLETE"
  );
  assertDefined(completedOrder.completedAt, "Completed time should be defined");
});

// Test: Return to Pending
test("should return processing order back to pending at front of queue", () => {
  const orderService = new OrderService();
  const order = orderService.createOrder("NORMAL");
  const dequeuedOrder = orderService.getNextPendingOrder();
  assertDefined(dequeuedOrder, "Dequeued order should be defined");
  dequeuedOrder.status = "PROCESSING";
  orderService.addToProcessing(dequeuedOrder);

  const returnedOrder = orderService.returnOrderToPending(dequeuedOrder.id);

  assertDefined(returnedOrder, "Returned order should be defined");
  assertEqual(
    returnedOrder.status,
    "PENDING",
    "Order status should be PENDING"
  );
  assertUndefined(returnedOrder.botId, "Bot ID should be undefined");
  assertUndefined(
    returnedOrder.processingStartedAt,
    "Processing started time should be undefined"
  );

  const pendingOrders = orderService.getPendingOrders();
  assertEqual(pendingOrders.length, 1, "Should have 1 pending order");
  assertEqual(
    pendingOrders[0].id,
    order.id,
    "Pending order should be the returned order"
  );
});

// Test: Return to Front of Queue
test("should add returned order to front of queue", () => {
  const orderService = new OrderService();
  const order1 = orderService.createOrder("NORMAL");
  const order2 = orderService.createOrder("NORMAL");

  const dequeuedOrder = orderService.getNextPendingOrder();
  assertDefined(dequeuedOrder, "Dequeued order should be defined");
  dequeuedOrder.status = "PROCESSING";
  orderService.addToProcessing(dequeuedOrder);

  orderService.returnOrderToPending(order1.id);

  const nextOrder = orderService.getNextPendingOrder();
  assertDefined(nextOrder, "Next order should be defined");
  assertEqual(
    nextOrder.id,
    order1.id,
    "Next order should be order1 (returned order)"
  );
});

// Summary
console.log("\n" + "=".repeat(50));
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log("=".repeat(50) + "\n");

if (failedTests > 0) {
  process.exit(1);
}
