import { Order, OrderType } from "../model";
import LinkedList from "../model/linkedlist";

/**
 * OrderQueue handles orders for VIP and Normal orders
 *
 * Note: This is class is safe for concurrent reads / writes
 *       because all operations are sync for the take home assignment.
 */
export class OrderQueue {
  // Use LinkedList to be a little performant; And just for the fun of it.
  private vipQueue: LinkedList<Order>;
  private normalQueue: LinkedList<Order>;

  constructor() {
    this.vipQueue = new LinkedList<Order>();
    this.normalQueue = new LinkedList<Order>();
  }

  enqueue(order: Order) {
    if (order.type === OrderType.VIP) {
      this.vipQueue.enqueue(order);
    } else {
      this.normalQueue.enqueue(order);
    }
  }

  dequeue(): Order | undefined {
    if (this.vipQueue.size > 0) {
      return this.vipQueue.dequeue();
    } else {
      return this.normalQueue.dequeue();
    }
  }

  enqueueFront(order: Order) {
    if (order.type === OrderType.VIP) {
      this.vipQueue.enqueueFront(order);
    } else {
      this.normalQueue.enqueueFront(order);
    }
  }

  peek() {
    return [...this.vipQueue.toArray(), ...this.normalQueue.toArray()]
  }

  size(): number {
    return this.vipQueue.size + this.normalQueue.size;
  }

  isEmpty(): boolean {
    return this.size() === 0;
  }
}
