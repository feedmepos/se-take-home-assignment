import { Injectable } from '@nestjs/common';
import { Order } from 'src/order/entities/order.entity';
import { OrderType } from 'src/order/enums/order-type.enum';

@Injectable()
export class QueueService {
  private vipQueue: Order[] = [];
  private normalQueue: Order[] = [];
  private listeners: Array<() => boolean> = [];

  enqueue(order: Order): void {
    if (order.type === OrderType.VIP) {
      this.vipQueue.push(order);
    } else {
      this.normalQueue.push(order);
    }

    this.notifyListeners();
  }

  dequeue(): Order | null {
    if (this.vipQueue.length > 0) {
      return this.vipQueue.shift()!;
    }

    if (this.normalQueue.length > 0) {
      return this.normalQueue.shift()!;
    }

    return null;
  }

  returnToQueue(order: Order): void {
    if (order.type === OrderType.VIP) {
      this.vipQueue.unshift(order);
    } else {
      this.normalQueue.unshift(order);
    }

    this.notifyListeners();
  }

  getQueueSize(): number {
    return this.vipQueue.length + this.normalQueue.length;
  }

  getVipQueue(): Order[] {
    return [...this.vipQueue];
  }

  getNormalQueue(): Order[] {
    return [...this.normalQueue];
  }

  getAllPendingOrders(): Order[] {
    return [...this.vipQueue, ...this.normalQueue];
  }

  subscribe(callback: () => boolean): void {
    this.listeners.push(callback);
  }

  unsubscribe(callback: () => boolean): void {
    this.listeners = this.listeners.filter((cb) => cb !== callback);
  }

  private notifyListeners(): void {
    for (let i = 0; i < this.listeners.length && this.getQueueSize() > 0; i++) {
      const callback = this.listeners[i];
      callback();
    }
  }
}
