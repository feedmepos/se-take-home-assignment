import test from "node:test";
import assert from "node:assert/strict";
import { OrderController } from "../src/core/orderController";
import {
  TimerAdapter,
  TimerHandle,
} from "../src/core/orderController.types";

class FakeTimerAdapter implements TimerAdapter {
  private nextId = 1;
  private readonly tasks = new Map<number, () => void>();

  schedule(callback: () => void): TimerHandle {
    const id = this.nextId++;
    this.tasks.set(id, callback);
    return { id };
  }

  cancel(handle: TimerHandle): void {
    this.tasks.delete(handle.id);
  }

  run(handleId: number): void {
    const callback = this.tasks.get(handleId);

    if (!callback) {
      throw new Error(`No timer found for handle ${handleId}.`);
    }

    this.tasks.delete(handleId);
    callback();
  }

  runAll(): void {
    while (this.tasks.size > 0) {
      const [handleId] = this.tasks.keys();
      this.run(handleId);
    }
  }
}

test("adds normal orders to pending in increasing order", () => {
  const controller = new OrderController();

  const createdOrders = controller.addNormalOrders(2);
  const status = controller.getStatus();

  assert.deepEqual(createdOrders, [
    { id: 1, type: "NORMAL" },
    { id: 2, type: "NORMAL" },
  ]);
  assert.deepEqual(status.pendingOrders, createdOrders);
});

test("inserts VIP orders ahead of normal orders but behind existing VIP orders", () => {
  const controller = new OrderController();

  controller.addNormalOrders(2);
  controller.addVipOrders(2);
  controller.addNormalOrders(1);
  controller.addVipOrders(1);

  assert.deepEqual(controller.getStatus().pendingOrders, [
    { id: 3, type: "VIP" },
    { id: 4, type: "VIP" },
    { id: 6, type: "VIP" },
    { id: 1, type: "NORMAL" },
    { id: 2, type: "NORMAL" },
    { id: 5, type: "NORMAL" },
  ]);
});

test("adding a bot immediately starts processing the next pending order", () => {
  const timerAdapter = new FakeTimerAdapter();
  const controller = new OrderController({ timerAdapter });

  controller.addVipOrders(1);
  controller.addNormalOrders(1);
  controller.addBot();

  assert.deepEqual(controller.getStatus(), {
    pendingOrders: [{ id: 2, type: "NORMAL" }],
    completedOrders: [],
    bots: [
      {
        id: 1,
        status: "PROCESSING",
        currentOrder: { id: 1, type: "VIP" },
      },
    ],
  });
});

test("completed orders move to COMPLETE with timestamps and bots keep working", () => {
  const timerAdapter = new FakeTimerAdapter();
  let callCount = 0;
  const now = () => {
    callCount += 1;
    return new Date(`2026-06-14T12:34:5${callCount}+08:00`);
  };
  const controller = new OrderController({ timerAdapter, now });

  controller.addVipOrders(1);
  controller.addNormalOrders(1);
  controller.addBot();

  timerAdapter.runAll();

  assert.deepEqual(controller.getStatus(), {
    pendingOrders: [],
    completedOrders: [
      { id: 1, type: "VIP", completedAt: "12:34:51" },
      { id: 2, type: "NORMAL", completedAt: "12:34:52" },
    ],
    bots: [
      {
        id: 1,
        status: "IDLE",
        currentOrder: null,
      },
    ],
  });
});

test("fires a completion event when an order finishes", () => {
  const timerAdapter = new FakeTimerAdapter();
  const completedEvents: Array<{ id: number; type: string; completedAt: string }> = [];
  const controller = new OrderController({
    timerAdapter,
    now: () => new Date("2026-06-14T12:34:56+08:00"),
    onOrderCompleted: (order) => {
      completedEvents.push(order);
    },
  });

  controller.addVipOrders(1);
  controller.addBot();

  timerAdapter.runAll();

  assert.deepEqual(completedEvents, [
    { id: 1, type: "VIP", completedAt: "12:34:56" },
  ]);
});

test("removing the newest busy bot returns its order to pending with correct priority", () => {
  const timerAdapter = new FakeTimerAdapter();
  const controller = new OrderController({ timerAdapter });

  controller.addVipOrders(2);
  controller.addNormalOrders(2);
  controller.addBot();
  controller.addBot();

  const removedBot = controller.removeBot();

  assert.deepEqual(removedBot, {
    id: 2,
    status: "IDLE",
    currentOrder: null,
  });
  assert.deepEqual(controller.getStatus(), {
    pendingOrders: [
      { id: 2, type: "VIP" },
      { id: 3, type: "NORMAL" },
      { id: 4, type: "NORMAL" },
    ],
    completedOrders: [],
    bots: [
      {
        id: 1,
        status: "PROCESSING",
        currentOrder: { id: 1, type: "VIP" },
      },
    ],
  });
});

test("re-adding a bot resumes the interrupted VIP order before later VIP orders", () => {
  const timerAdapter = new FakeTimerAdapter();
  const controller = new OrderController({ timerAdapter });

  controller.addVipOrders(4);
  controller.addNormalOrders(1);
  controller.addBot();
  controller.addBot();
  controller.addBot();

  controller.removeBot();
  controller.addBot();

  assert.deepEqual(controller.getStatus(), {
    pendingOrders: [
      { id: 4, type: "VIP" },
      { id: 5, type: "NORMAL" },
    ],
    completedOrders: [],
    bots: [
      {
        id: 1,
        status: "PROCESSING",
        currentOrder: { id: 1, type: "VIP" },
      },
      {
        id: 2,
        status: "PROCESSING",
        currentOrder: { id: 2, type: "VIP" },
      },
      {
        id: 4,
        status: "PROCESSING",
        currentOrder: { id: 3, type: "VIP" },
      },
    ],
  });
});

test("re-adding a bot resumes the interrupted normal order before later normal orders", () => {
  const timerAdapter = new FakeTimerAdapter();
  const controller = new OrderController({ timerAdapter });

  controller.addNormalOrders(4);
  controller.addBot();
  controller.addBot();
  controller.addBot();

  controller.removeBot();
  controller.addBot();

  assert.deepEqual(controller.getStatus(), {
    pendingOrders: [{ id: 4, type: "NORMAL" }],
    completedOrders: [],
    bots: [
      {
        id: 1,
        status: "PROCESSING",
        currentOrder: { id: 1, type: "NORMAL" },
      },
      {
        id: 2,
        status: "PROCESSING",
        currentOrder: { id: 2, type: "NORMAL" },
      },
      {
        id: 4,
        status: "PROCESSING",
        currentOrder: { id: 3, type: "NORMAL" },
      },
    ],
  });
});

test("removing the newest idle bot leaves processing orders untouched", () => {
  const timerAdapter = new FakeTimerAdapter();
  const controller = new OrderController({ timerAdapter });

  controller.addNormalOrders(1);
  controller.addBot();
  controller.addBot();

  const removedBot = controller.removeBot();

  assert.deepEqual(removedBot, {
    id: 2,
    status: "IDLE",
    currentOrder: null,
  });
  assert.deepEqual(controller.getStatus().bots, [
    {
      id: 1,
      status: "PROCESSING",
      currentOrder: { id: 1, type: "NORMAL" },
    },
  ]);
});

test("adding orders after bots are idle starts processing immediately", () => {
  const timerAdapter = new FakeTimerAdapter();
  const controller = new OrderController({ timerAdapter });

  controller.addBot();
  controller.addNormalOrders(1);

  assert.deepEqual(controller.getStatus().bots, [
    {
      id: 1,
      status: "PROCESSING",
      currentOrder: { id: 1, type: "NORMAL" },
    },
  ]);
});

test("rejects non-positive order counts", () => {
  const controller = new OrderController();

  assert.throws(() => controller.addNormalOrders(0), {
    message: "Order count must be a positive integer.",
  });
});
