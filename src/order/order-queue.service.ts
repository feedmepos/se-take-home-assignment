import { Order, OrderType } from './order.model.js';

export class OrderQueueService {
  private vipQueue: Order[] = [];
  private normalQueue: Order[] = [];
  private nextId = 1;

  addOrder(type: OrderType): Order {
    const order: Order = { id: this.nextId++, type, status: 'pending' };
    if (type === 'vip') {
      this.vipQueue.push(order);
    } else {
      this.normalQueue.push(order);
    }
    return order;
  }

  pending(): Order[] {
    return [...this.vipQueue, ...this.normalQueue];
  }

  isEmpty(): boolean {
    return this.vipQueue.length === 0 && this.normalQueue.length === 0;
  }

  nextOrder(): Order | null {
    if (this.vipQueue.length > 0) {
      return this.vipQueue.shift()!;
    }
    if (this.normalQueue.length > 0) {
      return this.normalQueue.shift()!;
    }
    return null;
  }

  returnOrder(order: Order): void {
    order.status = 'pending';
    const targetQueue = order.type === 'vip' ? this.vipQueue : this.normalQueue;
    const insertIndex = targetQueue.findIndex((o) => o.id > order.id);
    if (insertIndex === -1) {
      targetQueue.push(order);
    } else {
      targetQueue.splice(insertIndex, 0, order);
    }
  }
}
