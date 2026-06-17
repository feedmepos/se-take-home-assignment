import type { Order } from "./types";

/** Sort tier: VIP orders rank ahead of NORMAL orders. */
const tier = (order: Order): number => (order.type === "VIP" ? 0 : 1);

/** Orders sort by tier (VIP first), then ascending id (FIFO within a tier). */
export function compareOrders(a: Order, b: Order): number {
  return tier(a) - tier(b) || a.id - b.id;
}

/** Inserts `order` into `queue`, returning a new array kept sorted by `compareOrders`. */
export function insertOrder(queue: readonly Order[], order: Order): Order[] {
  return [...queue, order].sort(compareOrders);
}

/** Returns the highest-priority pending order, or undefined if the queue is empty. */
export function pickNext(queue: readonly Order[]): Order | undefined {
  return queue[0];
}
