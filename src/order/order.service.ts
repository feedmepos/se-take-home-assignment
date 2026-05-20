import { Injectable } from '@nestjs/common';
import { Order, OrderStatus, OrderType } from './order.types';

@Injectable()
export class OrderService {
  private pendingQueue: Order[] = [];
  private completedOrders: Order[] = [];
  private nextOrderId = 1;

  createOrder(type: OrderType): Order {
    const order: Order = {
      id: this.nextOrderId++,
      type,
      status: OrderStatus.PENDING,
      createdAt: new Date(),
    };
    this.enqueueOrder(order);
    return order;
  }

  private enqueueOrder(order: Order): void {
    order.status = OrderStatus.PENDING;
    if (order.type === OrderType.VIP) {
      // Insert after the last existing VIP order so VIPs queue among themselves
      // but always appear before all Normal orders
      let insertIndex = 0;
      for (let i = 0; i < this.pendingQueue.length; i++) {
        if (this.pendingQueue[i].type === OrderType.VIP) {
          insertIndex = i + 1;
        }
      }
      this.pendingQueue.splice(insertIndex, 0, order);
    } else {
      this.pendingQueue.push(order);
    }
  }

  getNextPendingOrder(): Order | null {
    const order = this.pendingQueue.shift();
    if (order) {
      order.status = OrderStatus.PROCESSING;
      order.processedAt = new Date();
      return order;
    }
    return null;
  }

  completeOrder(order: Order): void {
    order.status = OrderStatus.COMPLETE;
    order.completedAt = new Date();
    this.completedOrders.push(order);
  }

  returnOrderToPending(order: Order): void {
    this.enqueueOrder(order);
  }

  getPendingQueue(): Order[] {
    return [...this.pendingQueue];
  }

  getCompletedOrders(): Order[] {
    return [...this.completedOrders];
  }

  getPendingCount(): number {
    return this.pendingQueue.length;
  }
}
