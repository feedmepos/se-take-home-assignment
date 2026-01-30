import { Injectable } from '@nestjs/common';
import { Order, OrderStatus, OrderSummary, OrderType } from './order.types';
import { LoggerService } from '../logger/logger.service';
import { PROCESSING_TIME_MS } from '../bot/bot.types';

@Injectable()
export class OrderService {
  private nextOrderId = 1001;

  private readonly vipQueue: Order[] = [];
  private readonly normalQueue: Order[] = [];
  private readonly completed: Order[] = [];

  constructor(private readonly logger: LoggerService) { }

  createOrder(type: OrderType): Order {
    const order: Order = {
      id: this.nextOrderId++,
      type,
      status: OrderStatus.PENDING,
      createdAt: new Date(),
    };

    if (type === OrderType.VIP) {
      this.vipQueue.push(order);
      this.sortByCreatedAt(this.vipQueue);
      this.logger.log(
        `Created VIP Order #${order.id} - Status: PENDING`,
      );
    } else {
      this.normalQueue.push(order);
      this.sortByCreatedAt(this.normalQueue);
      this.logger.log(
        `Created Normal Order #${order.id} - Status: PENDING`,
      );
    }

    return order;
  }

  /**
   * Returns the next pending order with VIP priority, or undefined if none.
   */
  getNextPendingOrder(): Order | undefined {
    const order =
      this.vipQueue.shift() ??
      this.normalQueue.shift();

    if (order) {
      order.status = OrderStatus.PROCESSING;
      order.startedAt = new Date();
    }

    return order;
  }

  /**
   * Returns an order back to the appropriate pending queue,
   * preserving VIP/normal semantics.
   */
  returnToPending(order: Order): void {
    order.status = OrderStatus.PENDING;
    order.startedAt = undefined;

    if (order.type === OrderType.VIP) {
      this.vipQueue.push(order);
      this.sortByCreatedAt(this.vipQueue);
    } else {
      this.normalQueue.push(order);
      this.sortByCreatedAt(this.normalQueue);
    }

    this.logger.log(
      `Order #${order.id} returned to PENDING (re-queued by priority and createdAt)`,
    );
  }

  completeOrder(botId: Number, order: Order): void {
    order.status = OrderStatus.COMPLETE;
    order.completedAt = new Date();
    this.completed.push(order);
    this.logger.log(
      `Bot #${botId} completed ${order.type} Order #${order.id} - Status: ${order.status} (Processing time: ${PROCESSING_TIME_MS / 1000}s)`
    );
  }

  hasPendingOrders(): boolean {
    return this.vipQueue.length > 0 || this.normalQueue.length > 0;
  }

  getSummary(): OrderSummary {
    const pending =
      this.vipQueue.length + this.normalQueue.length;

    const vipCompleted = this.completed.filter(
      o => o.type === OrderType.VIP,
    ).length;

    const normalCompleted = this.completed.filter(
      o => o.type === OrderType.NORMAL,
    ).length;

    return {
      totalProcessed: this.completed.length,
      vipCompleted,
      normalCompleted,
      pending,
    };
  }

  getPending() {
    return [...this.vipQueue, ...this.normalQueue];
  }
  
  getCompleted() {
    return [...this.completed];
  }

  private sortByCreatedAt(queue: Order[]): void {
    queue.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
  }
}

