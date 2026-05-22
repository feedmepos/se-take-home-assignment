import { Order, ORDER_TYPES } from "../domain/types";

/**
 * Maintains the VIP-first pending order queues.
 */
export class PendingQueue {
  private readonly vip: Order[] = [];
  private readonly normal: Order[] = [];

  enqueue(order: Order, front = false): void {
    const bucket = order.type === ORDER_TYPES.VIP ? this.vip : this.normal;
    if (front) {
      bucket.unshift(order);
    } else {
      bucket.push(order);
    }
  }

  dequeue(): Order | null {
    if (this.vip.length > 0) {
      return this.vip.shift() ?? null;
    }
    if (this.normal.length > 0) {
      return this.normal.shift() ?? null;
    }
    return null;
  }

  isEmpty(): boolean {
    return this.vip.length === 0 && this.normal.length === 0;
  }

  getVipSnapshot(): ReadonlyArray<Order> {
    return [...this.vip];
  }

  getNormalSnapshot(): ReadonlyArray<Order> {
    return [...this.normal];
  }

  size(): number {
    return this.vip.length + this.normal.length;
  }
}
