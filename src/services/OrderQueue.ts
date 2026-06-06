import { Order } from '../models/Order';

export class OrderQueue {
  private vipQueue: Order[] = [];
  private normalQueue: Order[] = [];

  enqueue(order: Order): void {
    if (order.isVip) {
      this.vipQueue.push(order);
    } else {
      this.normalQueue.push(order);
    }
  }

  dequeue(): Order | null {
    if (this.vipQueue.length > 0) return this.vipQueue.shift()!;
    if (this.normalQueue.length > 0) return this.normalQueue.shift()!;
    return null;
  }

  size(): number {
    return this.vipQueue.length + this.normalQueue.length;
  }

  requeue(order: Order): void {
    if (order.isVip) {
      this.vipQueue.unshift(order);
    } else {
      this.normalQueue.unshift(order);
    }
  }

  getAll(): Order[] {
    return [...this.vipQueue, ...this.normalQueue];
  }
}
