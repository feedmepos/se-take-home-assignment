import { test } from "node:test";
import assert from "node:assert/strict";
import { OrderController } from "../domain/OrderController.js";
import type { Scheduler, SchedulerHandle } from "../domain/types.js";

function makeLogger(): { log: string[]; fn: (m: string) => void } {
  const log: string[] = [];
  return { log, fn: (m: string) => void log.push(m) };
}

class FakeScheduler implements Scheduler {
  private queues: Map<number, Array<() => void>> = new Map();

  schedule(callback: () => void, _ms: number): SchedulerHandle {
    const key = Math.random();
    this.queues.set(key, [callback]);
    const queues = this.queues;
    const handle: SchedulerHandle = {
      clear() {
        queues.delete(key);
      },
    };
    return handle;
  }

  flush(): void {
    // Snapshot callbacks first so callbacks scheduled during this tick
    // (e.g. a bot picking up the next order) are not fired in the same tick.
    const pending = [...this.queues.values()].flat();
    this.queues.clear();
    for (const cb of pending) cb();
  }
}

test("order numbers start at 1001 and increase uniquely", () => {
  const { fn } = makeLogger();
  const controller = new OrderController({ logger: fn });
  const o1 = controller.createOrder("NORMAL");
  const o2 = controller.createOrder("VIP");
  const o3 = controller.createOrder("NORMAL");
  assert.equal(o1.id, 1001);
  assert.equal(o2.id, 1002);
  assert.equal(o3.id, 1003);
});

test("VIP orders queue ahead of Normal but behind existing VIP", () => {
  const { fn } = makeLogger();
  const controller = new OrderController({ logger: fn });
  controller.createOrder("NORMAL");
  controller.createOrder("VIP");
  controller.createOrder("VIP");
  controller.createOrder("NORMAL");
  const snap = controller.snapshot();
  assert.deepEqual(
    snap.pending.map((o) => o.id),
    [1002, 1003, 1001, 1004],
  );
});

test("addBot picks up the head pending order and marks it PROCESSING", () => {
  const { fn } = makeLogger();
  const scheduler = new FakeScheduler();
  const controller = new OrderController({ logger: fn, scheduler });
  controller.createOrder("VIP");
  controller.createOrder("NORMAL");
  controller.addBot();
  const snap = controller.snapshot();
  assert.equal(snap.processing.length, 1);
  assert.equal(snap.processing[0].orderId, 1001);
  assert.equal(snap.pending.length, 1);
  assert.equal(snap.pending[0].id, 1002);
});

test("addBot with no pending orders becomes IDLE", () => {
  const { fn } = makeLogger();
  const scheduler = new FakeScheduler();
  const controller = new OrderController({ logger: fn, scheduler });
  controller.addBot();
  const snap = controller.snapshot();
  assert.equal(snap.bots.length, 1);
  assert.equal(snap.bots[0].status, "IDLE");
  assert.equal(snap.bots[0].currentOrderId, null);
});

test("bot completes order after 10s and picks up next pending", () => {
  const { fn } = makeLogger();
  const scheduler = new FakeScheduler();
  const controller = new OrderController({ logger: fn, scheduler });
  controller.createOrder("VIP");
  controller.createOrder("NORMAL");
  controller.addBot();
  scheduler.flush();
  const snap = controller.snapshot();
  assert.equal(snap.complete.length, 1);
  assert.equal(snap.complete[0].id, 1001);
  assert.equal(snap.processing.length, 1);
  assert.equal(snap.processing[0].orderId, 1002);
});

test("bot becomes IDLE when no pending orders remain after completion", () => {
  const { fn } = makeLogger();
  const scheduler = new FakeScheduler();
  const controller = new OrderController({ logger: fn, scheduler });
  controller.createOrder("VIP");
  controller.addBot();
  scheduler.flush();
  const snap = controller.snapshot();
  assert.equal(snap.complete.length, 1);
  assert.equal(snap.bots[0].status, "IDLE");
  assert.equal(snap.bots[0].currentOrderId, null);
});

test("removeBot returns in-progress order to its priority position", () => {
  const { fn } = makeLogger();
  const scheduler = new FakeScheduler();
  const controller = new OrderController({ logger: fn, scheduler });
  controller.createOrder("VIP");
  controller.createOrder("NORMAL");
  controller.createOrder("NORMAL");
  controller.addBot();
  controller.addBot();
  controller.removeBot();
  const snap = controller.snapshot();
  assert.deepEqual(
    snap.pending.map((o) => o.id),
    [1003, 1002],
  );
  assert.equal(snap.processing.length, 1);
  assert.equal(snap.processing[0].orderId, 1001);
  assert.equal(snap.bots.length, 1);
});

test("removeBot on an idle bot does not create phantom orders", () => {
  const { fn } = makeLogger();
  const scheduler = new FakeScheduler();
  const controller = new OrderController({ logger: fn, scheduler });
  controller.addBot();
  controller.removeBot();
  const snap = controller.snapshot();
  assert.equal(snap.bots.length, 0);
  assert.equal(snap.pending.length, 0);
});

test("removeBot returns VIP order to the VIP segment, ahead of Normal", () => {
  const { fn } = makeLogger();
  const scheduler = new FakeScheduler();
  const controller = new OrderController({ logger: fn, scheduler });
  controller.createOrder("VIP");
  controller.createOrder("VIP");
  controller.createOrder("NORMAL");
  controller.addBot();
  controller.addBot();
  controller.addBot();
  controller.removeBot();
  const snap = controller.snapshot();
  assert.deepEqual(
    snap.pending.map((o) => o.id),
    [1003],
  );
});

test("idle bot picks up a new order immediately when it arrives", () => {
  const { fn } = makeLogger();
  const scheduler = new FakeScheduler();
  const controller = new OrderController({ logger: fn, scheduler });
  controller.addBot();
  controller.createOrder("VIP");
  const snap = controller.snapshot();
  assert.equal(snap.processing.length, 1);
  assert.equal(snap.processing[0].orderId, 1001);
  assert.equal(snap.bots[0].status, "ACTIVE");
});
