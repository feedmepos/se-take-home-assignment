import { describe, expect, it } from "vitest";
import { compareOrders, insertOrder, pickNext } from "./queue";
import type { Order } from "./types";

function makeOrder(id: number, type: Order["type"]): Order {
  return { id, type, status: "PENDING", createdAt: id };
}

describe("insertOrder", () => {
  it("appends a new NORMAL order to the back of an existing NORMAL queue", () => {
    const queue = [makeOrder(1, "NORMAL")];
    const result = insertOrder(queue, makeOrder(2, "NORMAL"));
    expect(result).toEqual([makeOrder(1, "NORMAL"), makeOrder(2, "NORMAL")]);
  });

  it("places a new VIP order ahead of an existing NORMAL order", () => {
    const queue = [makeOrder(1, "NORMAL")];
    const result = insertOrder(queue, makeOrder(2, "VIP"));
    expect(result).toEqual([makeOrder(2, "VIP"), makeOrder(1, "NORMAL")]);
  });

  it("places a new VIP order behind existing VIPs but ahead of all NORMALs", () => {
    const queue = [makeOrder(1, "VIP"), makeOrder(2, "NORMAL")];
    const result = insertOrder(queue, makeOrder(3, "VIP"));
    expect(result).toEqual([
      makeOrder(1, "VIP"),
      makeOrder(3, "VIP"),
      makeOrder(2, "NORMAL"),
    ]);
  });

  it("does not mutate the input array", () => {
    const queue = [makeOrder(1, "NORMAL")];
    const snapshot = [...queue];
    insertOrder(queue, makeOrder(2, "VIP"));
    expect(queue).toEqual(snapshot);
  });

  it("produces a strictly tier-then-id ordering across a mixed sequence of inserts", () => {
    let queue: Order[] = [];
    queue = insertOrder(queue, makeOrder(1, "NORMAL"));
    queue = insertOrder(queue, makeOrder(2, "NORMAL"));
    queue = insertOrder(queue, makeOrder(3, "VIP"));
    queue = insertOrder(queue, makeOrder(4, "NORMAL"));
    queue = insertOrder(queue, makeOrder(5, "VIP"));

    expect(queue).toEqual([
      makeOrder(3, "VIP"),
      makeOrder(5, "VIP"),
      makeOrder(1, "NORMAL"),
      makeOrder(2, "NORMAL"),
      makeOrder(4, "NORMAL"),
    ]);
  });
});

describe("compareOrders", () => {
  it("ranks VIP orders ahead of NORMAL orders regardless of id", () => {
    expect(
      compareOrders(makeOrder(10, "VIP"), makeOrder(1, "NORMAL")),
    ).toBeLessThan(0);
  });

  it("orders same-tier orders by ascending id (FIFO)", () => {
    expect(
      compareOrders(makeOrder(1, "NORMAL"), makeOrder(2, "NORMAL")),
    ).toBeLessThan(0);
    expect(
      compareOrders(makeOrder(2, "VIP"), makeOrder(1, "VIP")),
    ).toBeGreaterThan(0);
  });
});

describe("pickNext", () => {
  it("returns undefined for an empty queue", () => {
    expect(pickNext([])).toBeUndefined();
  });

  it("returns the highest-priority order (VIP before NORMAL)", () => {
    const queue = [makeOrder(2, "VIP"), makeOrder(1, "NORMAL")];
    expect(pickNext(queue)).toEqual(makeOrder(2, "VIP"));
  });
});
