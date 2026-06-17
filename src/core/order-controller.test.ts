import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatClock } from "./format-time";
import { OrderController } from "./order-controller";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-17T09:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
});

describe("OrderController", () => {
  // Must-pass 1: New NORMAL order appends to the back of PENDING.
  it("appends a new NORMAL order to the back of PENDING", () => {
    const controller = new OrderController();
    controller.addNormalOrder();
    controller.addNormalOrder();

    const { pending } = controller.getSnapshot();
    expect(pending.map((o) => o.id)).toEqual([1, 2]);
    expect(pending.every((o) => o.type === "NORMAL")).toBe(true);
  });

  // Must-pass 2: New VIP order sits behind existing VIPs, ahead of all NORMALs.
  it("places a new VIP order behind existing VIPs and ahead of all NORMALs", () => {
    const controller = new OrderController();
    controller.addNormalOrder(); // id 1, NORMAL
    controller.addVipOrder(); // id 2, VIP
    controller.addNormalOrder(); // id 3, NORMAL
    controller.addVipOrder(); // id 4, VIP

    const { pending } = controller.getSnapshot();
    expect(pending.map((o) => [o.id, o.type])).toEqual([
      [2, "VIP"],
      [4, "VIP"],
      [1, "NORMAL"],
      [3, "NORMAL"],
    ]);
  });

  // Must-pass 3: Order ids are unique and strictly increasing across both types.
  it("assigns unique, strictly increasing ids across NORMAL and VIP orders", () => {
    const controller = new OrderController();
    controller.addNormalOrder(); // id 1
    controller.addVipOrder(); // id 2
    controller.addNormalOrder(); // id 3
    controller.addVipOrder(); // id 4
    controller.addNormalOrder(); // id 5

    const { pending } = controller.getSnapshot();
    const ids = pending.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);

    // Same-tier orders preserve strictly increasing creation order (FIFO).
    const normalIds = pending
      .filter((o) => o.type === "NORMAL")
      .map((o) => o.id);
    const vipIds = pending.filter((o) => o.type === "VIP").map((o) => o.id);
    expect(normalIds).toEqual([...normalIds].sort((a, b) => a - b));
    expect(vipIds).toEqual([...vipIds].sort((a, b) => a - b));
    expect(normalIds).toEqual([1, 3, 5]);
    expect(vipIds).toEqual([2, 4]);
  });

  // Must-pass 4: A bot processes the front order for exactly 10s, then it lands in COMPLETE.
  it("processes the front order for exactly 10s before completing it", () => {
    const controller = new OrderController();
    controller.addBot();
    controller.addNormalOrder();

    let snapshot = controller.getSnapshot();
    expect(snapshot.bots[0]?.status).toBe("PROCESSING");
    expect(snapshot.bots[0]?.currentOrderId).toBe(1);
    expect(snapshot.complete).toHaveLength(0);

    vi.advanceTimersByTime(9_999);
    snapshot = controller.getSnapshot();
    expect(snapshot.complete).toHaveLength(0);

    vi.advanceTimersByTime(1);
    snapshot = controller.getSnapshot();
    expect(snapshot.complete).toHaveLength(1);
    expect(snapshot.complete[0]?.status).toBe("COMPLETE");
    expect(snapshot.complete[0]?.id).toBe(1);
  });

  // Must-pass 5: After completing, the bot picks the next pending order; goes IDLE when none.
  it("picks up the next pending order after completing one, and goes IDLE when none remain", () => {
    const controller = new OrderController();
    controller.addBot();
    controller.addNormalOrder(); // id 1
    controller.addNormalOrder(); // id 2

    vi.advanceTimersByTime(10_000);

    let snapshot = controller.getSnapshot();
    expect(snapshot.complete.map((o) => o.id)).toEqual([1]);
    expect(snapshot.bots[0]?.status).toBe("PROCESSING");
    expect(snapshot.bots[0]?.currentOrderId).toBe(2);

    vi.advanceTimersByTime(10_000);

    snapshot = controller.getSnapshot();
    expect(snapshot.complete.map((o) => o.id).sort()).toEqual([1, 2]);
    expect(snapshot.bots[0]?.status).toBe("IDLE");
    expect(snapshot.bots[0]?.currentOrderId).toBeUndefined();
  });

  // Must-pass 6: +Bot immediately consumes a pending order when one exists.
  it("immediately consumes a pending order when +Bot is called", () => {
    const controller = new OrderController();
    controller.addNormalOrder();

    let snapshot = controller.getSnapshot();
    expect(snapshot.pending).toHaveLength(1);

    controller.addBot();

    snapshot = controller.getSnapshot();
    expect(snapshot.pending).toHaveLength(0);
    expect(snapshot.bots[0]?.status).toBe("PROCESSING");
    expect(snapshot.bots[0]?.currentOrderId).toBe(1);
  });

  // Must-pass 7 (headline): -Bot mid-process returns the in-flight order to its exact
  // original position and cancels its timer (no leaked completion).
  it("returns an in-flight order to its original slot on -Bot and cancels its timer", () => {
    const controller = new OrderController();
    controller.addNormalOrder(); // order1 (id 1, NORMAL) -> pending
    controller.addBot(); // bot1 immediately picks up order1
    controller.addNormalOrder(); // order2 (id 2, NORMAL) -> pending
    controller.addVipOrder(); // order3 (id 3, VIP) -> pending becomes [order3, order2]

    let snapshot = controller.getSnapshot();
    expect(snapshot.pending.map((o) => o.id)).toEqual([3, 2]);
    expect(snapshot.bots[0]?.currentOrderId).toBe(1);

    controller.removeBot(); // bot1 was processing order1

    snapshot = controller.getSnapshot();
    expect(snapshot.bots).toHaveLength(0);
    expect(snapshot.pending.map((o) => [o.id, o.type])).toEqual([
      [3, "VIP"],
      [1, "NORMAL"],
      [2, "NORMAL"],
    ]);
    expect(snapshot.pending.find((o) => o.id === 1)?.status).toBe("PENDING");

    // Prove the timer was actually cancelled: advancing past the original
    // completion window must NOT complete order1.
    vi.advanceTimersByTime(10_000);

    snapshot = controller.getSnapshot();
    expect(snapshot.complete).toHaveLength(0);
    expect(snapshot.pending.find((o) => o.id === 1)?.status).toBe("PENDING");
  });

  // Must-pass 8: Two bots process two orders in parallel; no order is assigned twice.
  it("processes two orders in parallel across two bots with no double-assignment", () => {
    const controller = new OrderController();
    controller.addNormalOrder(); // id 1
    controller.addNormalOrder(); // id 2
    controller.addBot();
    controller.addBot();

    let snapshot = controller.getSnapshot();
    expect(snapshot.pending).toHaveLength(0);
    const currentOrderIds = snapshot.bots.map((b) => b.currentOrderId).sort();
    expect(currentOrderIds).toEqual([1, 2]);
    expect(snapshot.bots.every((b) => b.status === "PROCESSING")).toBe(true);

    vi.advanceTimersByTime(10_000);

    snapshot = controller.getSnapshot();
    expect(snapshot.complete.map((o) => o.id).sort()).toEqual([1, 2]);
    const completeIds = snapshot.complete.map((o) => o.id);
    expect(new Set(completeIds).size).toBe(completeIds.length);
  });

  // Must-pass 9: completedAt is set on completion and formats to HH:MM:SS.
  it("stamps completedAt on completion, formatting to HH:MM:SS", () => {
    const controller = new OrderController();
    controller.addBot();
    controller.addNormalOrder();

    vi.advanceTimersByTime(10_000);

    const { complete } = controller.getSnapshot();
    const completed = complete[0];
    expect(completed?.completedAt).toBeDefined();
    expect(formatClock(completed?.completedAt ?? 0)).toBe("09:00:10");
  });

  // Must-pass 10: getSnapshot() returns a stable reference until state changes.
  it("returns a stable snapshot reference until a command mutates state", () => {
    const controller = new OrderController();
    const s1 = controller.getSnapshot();
    const s2 = controller.getSnapshot();
    expect(s1).toBe(s2);

    controller.addNormalOrder();
    const s3 = controller.getSnapshot();
    expect(s3).not.toBe(s1);

    const s4 = controller.getSnapshot();
    expect(s4).toBe(s3);
  });
});
