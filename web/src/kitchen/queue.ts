import type { Order, OrderType } from "./types";

export function insertOrderAt(slice: Order[], idx: number, o: Order): Order[] {
  if (idx < 0 || idx > slice.length) {
    throw new Error(`invalid insert index ${idx} for len ${slice.length}`);
  }
  return [...slice.slice(0, idx), o, ...slice.slice(idx)];
}

export function peekNextTier(
  vip: Order[],
  normal: Order[],
): { tier: OrderType; head: Order; idx: number } | undefined {
  if (vip.length > 0) {
    return { tier: "VIP", head: vip[0], idx: 0 };
  }
  if (normal.length > 0) {
    return { tier: "NORMAL", head: normal[0], idx: 0 };
  }
  return undefined;
}

export function dequeueHead(vip: Order[], normal: Order[]): {
  vip: Order[];
  normal: Order[];
  tier: OrderType;
  order: Order;
  idx: number;
} {
  const next = peekNextTier(vip, normal);
  if (!next) {
    throw new Error("cannot dequeue empty queues");
  }
  if (next.tier === "VIP") {
    return {
      vip: vip.slice(1),
      normal,
      tier: "VIP",
      order: next.head,
      idx: next.idx,
    };
  }
  return {
    vip,
    normal: normal.slice(1),
    tier: "NORMAL",
    order: next.head,
    idx: next.idx,
  };
}
