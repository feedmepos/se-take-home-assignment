import { Order } from "../entities/order.type";

export class PendingQueue {
  private vipQueue: Order[] = [];
  private normalQueue: Order[] = [];

  enqueue(order: Order): void {
    if (order.isVip) {
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

  removeById(orderId: number): Order | undefined {
    const vipIndex = this.vipQueue.findIndex((o) => o.id === orderId);
    if (vipIndex !== -1) {
      const [removed] = this.vipQueue.splice(vipIndex, 1);
      return removed;
    }
    const normalIndex = this.normalQueue.findIndex((o) => o.id === orderId);
    if (normalIndex !== -1) {
      const [removed] = this.normalQueue.splice(normalIndex, 1);
      return removed;
    }
    return undefined;
  }

  size(): number {
    return this.vipQueue.length + this.normalQueue.length;
  }

  vipSize(): number {
    return this.vipQueue.length;
  }

  normalSize(): number {
    return this.normalQueue.length;
  }

  peek(): Order | undefined {
    return this.vipQueue[0] ?? this.normalQueue[0];
  }
}
