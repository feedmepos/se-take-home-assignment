import { Order } from "../models/order";

export class OrderQueue {
  private orders: Order[] = [];

  get pendingCount(): number {
    return this.orders.length;
  }

  add(order: Order): void {
    // [v1, v2, n1, n2] + v3
    // [0, 0, 1, 1] vs 0
    // [false, false, true, true] => index 2
    // Time: O(n)
    const insertIndex = this.orders.findIndex((o) => o.priority > order.priority);

    if (insertIndex === -1) {
      this.orders.push(order);
    } else {
      this.orders.splice(insertIndex, 0, order);
    }
  }

  next(): Order | null {
    return this.orders.shift() || null;
  }

  requeue(order: Order): void {
    // Reset order status back to PENDING
    order.reset();

    // Option 1: Same as add() logic - place at end of category
    this.add(order);

    // Option 2: Place at front of category(recommended)
    // const samePriorityIndex = this.orders.findIndex((o) => o.priority === order.priority);
    // if (samePriorityIndex !== -1) {
    //   this.orders.splice(samePriorityIndex, 0, order);
    // } else {
    //   this.add(order);
    // }

    // Option 3: Place at front regardless of category
    // this.orders.unshift(order);
  }
}
