import { Order } from "./types";

export class OrderQueue {
  private vip: Order[] = [];
  private normal: Order[] = [];

  enqueue(order: Order): void {
    if (order.privilege === "VIP") this.vip.push(order);
    else this.normal.push(order);
  }

  dequeue(): Order | undefined {
    return this.vip.shift() ?? this.normal.shift();
  }

  size(): number {
    return this.vip.length + this.normal.length;
  }

  snapshotPendingIds(): number[] {
    return [...this.vip, ...this.normal].map((o) => o.id);
  }
}
