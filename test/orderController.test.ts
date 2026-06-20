import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type ControllerSnapshot,
  type ProcessingOrderSnapshot,
  OrderController,
  formatSecondsAsTime,
  parseTimeToSeconds,
} from "../src/orderController.js";

describe("OrderController", () => {
  it("queues VIP orders before normal orders while preserving FIFO inside each priority", () => {
    const controller = new OrderController({ firstOrderId: 1 });

    const normalOne = controller.addNormalOrder();
    const normalTwo = controller.addNormalOrder();
    const vipOne = controller.addVipOrder();
    const vipTwo = controller.addVipOrder();

    assert.deepEqual(
      controller.getSnapshot().pendingOrders.map((order) => order.id),
      [vipOne.id, vipTwo.id, normalOne.id, normalTwo.id]
    );
  });

  it("assigns a new bot to the highest-priority pending order immediately", () => {
    const controller = new OrderController({ firstOrderId: 1 });
    const normal = controller.addNormalOrder();
    const vip = controller.addVipOrder();

    controller.addBot();
    const snapshot = controller.getSnapshot();
    const processing = firstProcessingOrder(snapshot);

    assert.deepEqual(
      snapshot.pendingOrders.map((order) => order.id),
      [normal.id]
    );
    assert.equal(processing.order.id, vip.id);
  });

  it("does not complete an order until the full processing time has elapsed", () => {
    const controller = new OrderController({ firstOrderId: 1 });
    controller.addNormalOrder();
    controller.addBot();

    controller.advanceTime(9);
    assert.equal(controller.getSnapshot().completedOrders.length, 0);

    controller.advanceTime(1);
    assert.equal(controller.getSnapshot().completedOrders.length, 1);
  });

  it("continues with the next pending order after a bot completes its current order", () => {
    const controller = new OrderController({ firstOrderId: 1 });
    const first = controller.addNormalOrder();
    const second = controller.addNormalOrder();
    controller.addBot();

    controller.advanceTime(10);
    const snapshot = controller.getSnapshot();
    const processing = firstProcessingOrder(snapshot);

    assert.deepEqual(
      snapshot.completedOrders.map((order) => order.id),
      [first.id]
    );
    assert.equal(processing.order.id, second.id);
  });

  it("lets an idle bot pick up a later order immediately", () => {
    const controller = new OrderController({ firstOrderId: 1 });
    controller.addBot();

    const order = controller.addNormalOrder();
    const snapshot = controller.getSnapshot();
    const processing = firstProcessingOrder(snapshot);

    assert.equal(snapshot.pendingOrders.length, 0);
    assert.equal(processing.order.id, order.id);
  });

  it("removes the newest bot and returns its processing order to pending", () => {
    const controller = new OrderController({ firstOrderId: 1 });
    const first = controller.addNormalOrder();
    const second = controller.addNormalOrder();
    controller.addBot();
    controller.addBot();

    controller.advanceTime(5);
    controller.removeBot();
    let snapshot = controller.getSnapshot();

    assert.deepEqual(
      snapshot.bots.map((bot) => bot.id),
      [1]
    );
    assert.deepEqual(
      snapshot.pendingOrders.map((order) => order.id),
      [second.id]
    );

    controller.advanceTime(5);
    snapshot = controller.getSnapshot();

    assert.deepEqual(
      snapshot.completedOrders.map((order) => order.id),
      [first.id]
    );
    assert.equal(firstProcessingOrder(snapshot).order.id, second.id);
  });

  it("does not complete an order after the processing bot is destroyed", () => {
    const controller = new OrderController({ firstOrderId: 1 });
    const order = controller.addNormalOrder();
    controller.addBot();

    controller.advanceTime(5);
    controller.removeBot();
    controller.advanceTime(20);

    const snapshot = controller.getSnapshot();
    assert.equal(snapshot.completedOrders.length, 0);
    assert.deepEqual(
      snapshot.pendingOrders.map((pendingOrder) => pendingOrder.id),
      [order.id]
    );
  });

  it("does not interrupt a normal order already being processed when a VIP order arrives", () => {
    const controller = new OrderController({ firstOrderId: 1 });
    const normal = controller.addNormalOrder();
    controller.addBot();

    controller.advanceTime(1);
    const vip = controller.addVipOrder();

    assert.equal(firstProcessingOrder(controller.getSnapshot()).order.id, normal.id);

    controller.advanceTime(9);
    const snapshot = controller.getSnapshot();

    assert.deepEqual(
      snapshot.completedOrders.map((order) => order.id),
      [normal.id]
    );
    assert.equal(firstProcessingOrder(snapshot).order.id, vip.id);
  });

  it("handles removing a bot when none exist without crashing", () => {
    const controller = new OrderController();

    assert.equal(controller.removeBot(), null);
    assert.match(controller.formatEvents().at(-1) ?? "", /No bot available/);
  });

  it("rejects invalid time advancement values", () => {
    const controller = new OrderController();

    assert.throws(() => controller.advanceTime(-1), /non-negative integer/);
    assert.throws(() => controller.advanceTime(1.5), /non-negative integer/);
  });
});

describe("time helpers", () => {
  it("formats seconds as HH:MM:SS", () => {
    assert.equal(formatSecondsAsTime(0), "00:00:00");
    assert.equal(formatSecondsAsTime(3661), "01:01:01");
    assert.equal(formatSecondsAsTime(24 * 60 * 60), "00:00:00");
  });

  it("parses valid HH:MM:SS values and rejects invalid values", () => {
    assert.equal(parseTimeToSeconds("14:32:10"), 52330);
    assert.throws(() => parseTimeToSeconds("24:00:00"), /valid/);
    assert.throws(() => parseTimeToSeconds("1:2:3"), /HH:MM:SS/);
  });
});

function firstProcessingOrder(snapshot: ControllerSnapshot): ProcessingOrderSnapshot {
  const [processing] = snapshot.processingOrders;
  assert.ok(processing, "Expected one processing order");
  return processing;
}
