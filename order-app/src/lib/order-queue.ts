import { Order, OrderType } from "@/lib/types";

export class OrderQueue {
  private vipQueue: Order[] = [];
  private normalQueue: Order[] = [];

  enqueue(order: Order) {
    if (order.type === OrderType.VIP) {
      this.vipQueue.push(order);
    } else {
      this.normalQueue.push(order);
    }
  }

  dequeue(): Order | undefined {
    if (this.vipQueue.length > 0) {
      return this.vipQueue.shift();
    }

    return this.normalQueue.shift();
  }

  requeue(order: Order) {
    const queue = 
      order.type === OrderType.VIP
        ? this.vipQueue
        : this.normalQueue;

    const index = queue.findIndex(
      o => o.id > order.id
    );

    if (index === -1) {
      queue.push(order);
    } else {
      queue.splice(index, 0, order);
    }
  }

  getPending() {
    return [...this.vipQueue, ...this.normalQueue];
  }

  clear() {
    this.vipQueue = [];
    this.normalQueue = [];
  }
}