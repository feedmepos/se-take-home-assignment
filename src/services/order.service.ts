import { Order, OrderType, OrderStatus } from '../models/order.model';
import { LinkedQueue } from '../utils/linked-queue';

export class OrderService {
  private vipQueue: LinkedQueue<Order> = new LinkedQueue();
  private normalQueue: LinkedQueue<Order> = new LinkedQueue();
  private processingOrders: Order[] = [];
  private completedOrders: Order[] = [];
  private orderCounter: number = 1000;

  createOrder(type: OrderType): Order {
    const order: Order = {
      id: ++this.orderCounter,
      type,
      status: 'PENDING',
      createdAt: new Date()
    };

    if (type === 'VIP') {
      this.vipQueue.enqueue(order);
    } else {
      this.normalQueue.enqueue(order);
    }

    return order;
  }

  getNextPendingOrder(): Order | undefined {
    // VIP orders always have priority - O(1) operation!
    const order = this.vipQueue.dequeue() || this.normalQueue.dequeue();
    return order;
  }

  markOrderAsProcessing(orderId: number, botId: number): Order | undefined {
    // Note: This method is actually not needed anymore since getNextPendingOrder()
    // already removes the order from the queue. We'll keep it for compatibility
    // but it won't be used in the normal flow.
    const order = this.processingOrders.find(o => o.id === orderId);

    if (order) {
      order.status = 'PROCESSING';
      order.processingStartedAt = new Date();
      order.botId = botId;
    }

    return order;
  }

  markOrderAsComplete(orderId: number): Order | undefined {
    const order = this.processingOrders.find(o => o.id === orderId);
    if (order) {
      this.processingOrders = this.processingOrders.filter(o => o.id !== orderId);
      order.status = 'COMPLETE';
      order.completedAt = new Date();
      this.completedOrders.push(order);
    }
    return order;
  }

  returnOrderToPending(orderId: number): Order | undefined {
    const order = this.processingOrders.find(o => o.id === orderId);
    if (order) {
      this.processingOrders = this.processingOrders.filter(o => o.id !== orderId);
      order.status = 'PENDING';
      order.processingStartedAt = undefined;
      order.botId = undefined;

      // Put back to the FRONT of the appropriate queue - O(1) operation!
      // This ensures the interrupted order gets picked up as soon as possible
      if (order.type === 'VIP') {
        this.vipQueue.enqueueFront(order);
      } else {
        this.normalQueue.enqueueFront(order);
      }
    }
    return order;
  }

  getPendingOrders(): Order[] {
    return [...this.vipQueue.toArray(), ...this.normalQueue.toArray()];
  }

  getProcessingOrders(): Order[] {
    return [...this.processingOrders];
  }

  getCompletedOrders(): Order[] {
    return [...this.completedOrders];
  }

  getAllOrders(): { pending: Order[], processing: Order[], completed: Order[] } {
    return {
      pending: this.getPendingOrders(),
      processing: this.getProcessingOrders(),
      completed: this.getCompletedOrders()
    };
  }

  getPendingOrderCount(): number {
    return this.vipQueue.length + this.normalQueue.length;
  }

  // Internal method to add order to processing list
  addToProcessing(order: Order): void {
    this.processingOrders.push(order);
  }
}
