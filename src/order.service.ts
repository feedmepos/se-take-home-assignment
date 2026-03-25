import { Order } from "./types";

export class OrderService {
  private orders: Order[] = [];

  enqueue(order: Order): void {
    if (order.type === 'VIP') {
      // Find the first Normal order and insert before it
      const firstNormalIndex = this.orders.findIndex((o) => o.type === 'Normal');
      if (firstNormalIndex === -1) {
        this.orders.push(order);
      } else {
        this.orders.splice(firstNormalIndex, 0, order);
      }
    } else {
      // Normal orders go to the end
      this.orders.push(order);
    }
  }

  dequeue(): Order | null {
    return this.orders.shift() || null;
  }

  peek(): Order | null {
    return this.orders[0] || null;
  }

  size(): number {
    return this.orders.length;
  }

  getAll(): Order[] {
    return [...this.orders];
  }

  requeueOrder(order: Order): void {
    // Find the position of the first existing order of the same type
    const typeIndex = this.orders.findIndex((o) => o.type === order.type);

    if (typeIndex !== -1) {
      // Same type exists in queue — insert at the front of that type group
      this.orders.splice(typeIndex, 0, order);
    } else if (order.type === 'VIP') {
      // No VIP orders exist — insert before the first Normal to maintain priority
      const firstNormalIndex = this.orders.findIndex((o) => o.type === 'Normal');
      if (firstNormalIndex === -1) {
        this.orders.push(order);
      } else {
        this.orders.splice(firstNormalIndex, 0, order);
      }
    } else {
      // No Normal orders exist and order is Normal — push to end (behind all VIPs)
      this.orders.push(order);
    }
  }
}
