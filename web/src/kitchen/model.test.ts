import { describe, expect, it } from "vitest";
import { dequeueHead } from "./queue";
import { KitchenModel, createInitialKitchen } from "./model";

describe("queue", () => {
  it("dequeues VIP before NORMAL", () => {
    const vip = [{ id: 2, type: "VIP" as const }];
    const normal = [{ id: 1, type: "NORMAL" as const }];
    const r = dequeueHead(vip, normal);
    expect(r.order.id).toBe(2);
    expect(r.tier).toBe("VIP");
    expect(r.vip).toEqual([]);
    expect(r.normal).toEqual(normal);
  });
});

describe("KitchenModel", () => {
  it("places VIP ahead of normal in pending", () => {
    const k = new KitchenModel(60_000);
    k.addNormalOrder();
    k.addVIPOrder();
    k.addNormalOrder();
    const s = k.getSnapshot();
    expect(s.vip.map((o) => o.id)).toEqual([2]);
    expect(s.normal.map((o) => o.id)).toEqual([1, 3]);
  });

  it("removes newest bot by highest id", () => {
    const k = new KitchenModel(60_000);
    k.addBot();
    k.addBot();
    expect(k.getSnapshot().bots.map((b) => b.id)).toEqual([0, 1]);
    k.removeNewestBot();
    expect(k.getSnapshot().bots.map((b) => b.id)).toEqual([0]);
  });

  it("returns cancelled cook to pending preserving VIP/normal", () => {
    const k = new KitchenModel(60_000);
    k.addNormalOrder();
    k.addBot();
    expect(k.getSnapshot().bots[0].status).toBe("PROCESSING");
    k.removeNewestBot();
    const s = k.getSnapshot();
    expect(s.bots.length).toBe(0);
    expect(s.normal.map((o) => o.id)).toEqual([1]);
  });
});

describe("createInitialKitchen", () => {
  it("starts empty", () => {
    const s = createInitialKitchen();
    expect(s.vip.length + s.normal.length + s.bots.length + s.completed.length).toBe(0);
  });
});
