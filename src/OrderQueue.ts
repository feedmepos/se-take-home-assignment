import { Order, OrderType, OrderStatus } from './types';

/**
 * Priority queue for orders
 * VIP orders are placed before Normal orders
 * Within same type, orders are processed in FIFO order
 */
export class OrderQueue {
  private vipOrders: Order[] = [];
  private normalOrders: Order[] = [];
  private nextOrderId: number = 1001;

  /**
   * Create a new order
   */
  createOrder(type: OrderType): Order {
    const order: Order = {
      id: this.nextOrderId++,
      type,
      status: OrderStatus.PENDING,
      createdAt: new Date()
    };

    if (type === OrderType.VIP) {
      this.vipOrders.push(order);
    } else {
      this.normalOrders.push(order);
    }

    return order;
  }

  /**
   * Re-add an order that was being processed when a bot was removed
   * VIP orders go back to the end of VIP queue, Normal to end of Normal queue
   */
  reAddOrder(order: Order): void {
    order.status = OrderStatus.PENDING;
    order.processingStartedAt = undefined;
    order.processedByBotId = undefined;

    if (order.type === OrderType.VIP) {
      // Find position to insert (after existing VIP orders)
      this.vipOrders.push(order);
    } else {
      // Find position to insert (after existing Normal orders)
      this.normalOrders.push(order);
    }
  }

  /**
   * Get the next order to process (VIP first, then Normal)
   */
  getNextOrder(): Order | undefined {
    if (this.vipOrders.length > 0) {
      return this.vipOrders.shift();
    }
    return this.normalOrders.shift();
  }

  /**
   * Peek at the next order without removing it
   */
  peekNextOrder(): Order | undefined {
    if (this.vipOrders.length > 0) {
      return this.vipOrders[0];
    }
    return this.normalOrders[0];
  }

  /**
   * Check if there are any pending orders
   */
  hasPendingOrders(): boolean {
    return this.vipOrders.length > 0 || this.normalOrders.length > 0;
  }

  /**
   * Get all pending orders (for display purposes)
   */
  getPendingOrders(): Order[] {
    return [...this.vipOrders, ...this.normalOrders];
  }

  /**
   * Get count of pending orders
   */
  getPendingCount(): number {
    return this.vipOrders.length + this.normalOrders.length;
  }

  /**
   * Get count by type
   */
  getCountByType(type: OrderType): number {
    return type === OrderType.VIP ? this.vipOrders.length : this.normalOrders.length;
  }
}
