import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { newQueue, type Order } from "../src/orderQueue.js";

const log = () => {};

describe("OrderQueue", () => {
  test("normal orders queue correctly", () => {
    const queue = newQueue(log);

    queue.addOrder("normal");
    queue.addOrder("normal");

    assert.strictEqual(queue.pendingCounts(), 2);
    assert.strictEqual(queue.getNextOrder()?.type, "normal");
    assert.strictEqual(queue.getNextOrder()?.type, "normal");
  });

  test("VIP order place in front of normal orders", () => {
    const queue = newQueue(log);

    queue.addOrder("normal");
    queue.addOrder("normal");
    queue.addOrder("vip");
    queue.addOrder("normal");
    queue.addOrder("normal");
    queue.addOrder("vip");

    assert.strictEqual(queue.pendingCounts(), 6);
    assert.strictEqual(queue.getNextOrder()?.type, "vip");
    assert.strictEqual(queue.getNextOrder()?.type, "vip");
    assert.strictEqual(queue.getNextOrder()?.type, "normal");
    assert.strictEqual(queue.getNextOrder()?.type, "normal");
    assert.strictEqual(queue.getNextOrder()?.type, "normal");
    assert.strictEqual(queue.getNextOrder()?.type, "normal");
  });

  test("peek returns the next order without removing it", () => {
    const queue = newQueue(log);

    queue.addOrder("normal");
    queue.addOrder("vip");

    assert.strictEqual(queue.peek()?.type, "vip");
    assert.strictEqual(queue.pendingCounts(), 2);
  });

  test("dequeue returns undefined when queue is empty", () => {
    const queue = newQueue(log);

    assert.strictEqual(queue.getNextOrder(), null);
  });

  test("peek returns undefined when queue is empty", () => {
    const queue = newQueue(log);

    assert.strictEqual(queue.peek(), null);
  });

  test("handles multiple orders correctly", () => {
    const queue = newQueue(log);

    queue.addOrder("vip");
    queue.addOrder("normal");
    queue.addOrder("vip");
    assert.strictEqual(queue.getNextOrder()?.type, "vip");
    assert.strictEqual(queue.getNextOrder()?.type, "vip");
    queue.addOrder("normal");
    assert.strictEqual(queue.getNextOrder()?.type, "normal");
    assert.strictEqual(queue.getNextOrder()?.type, "normal");
    queue.addOrder("normal");
    queue.addOrder("normal");
    queue.addOrder("normal");
    queue.addOrder("vip");
    assert.strictEqual(queue.getNextOrder()?.type, "vip");
    queue.addOrder("normal");
    assert.strictEqual(queue.getNextOrder()?.type, "normal");
    assert.strictEqual(queue.getNextOrder()?.type, "normal");
    assert.strictEqual(queue.getNextOrder()?.type, "normal");
    assert.strictEqual(queue.getNextOrder()?.type, "normal");
    assert.strictEqual(queue.peek(), null);
  });

  test("returnOrder places the order back in the correct position", () => {
    const queue = newQueue(log);

    queue.addOrder("normal");
    queue.addOrder("vip");
    queue.addOrder("normal");

    const order2 = queue.getNextOrder(); // VIP order
    assert.strictEqual(order2?.type, "vip"); // VIP goes first
    queue.returnOrder(order2); // Return VIP order

    assert.strictEqual(queue.getNextOrder(), order2); // VIP should be next again
    assert.strictEqual(queue.getNextOrder()?.type, "normal"); // Normal orders follow
    assert.strictEqual(queue.getNextOrder()?.type, "normal");
  });
});
