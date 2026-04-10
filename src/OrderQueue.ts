import { Order, OrderType } from './types';

export class OrderQueue {
  private orders: Order[] = [];
  private nextOrderId = 1;

  enqueue(type: OrderType): Order {
    const order: Order = { id: this.nextOrderId++, type, status: 'PENDING' };

    if (type === 'VIP') {
      // Insert after the last existing VIP order (FIFO among VIPs, before all Normals)
      const lastVipIndex = this.orders.map(o => o.type).lastIndexOf('VIP');
      this.orders.splice(lastVipIndex + 1, 0, order);
    } else {
      this.orders.push(order);
    }

    return order;
  }

  // Re-insert a returned order at its original priority position
  requeue(order: Order): void {
    order.status = 'PENDING';

    if (order.type === 'VIP') {
      // Place after any VIP with a lower id, before any VIP with a higher id or any Normal
      const insertAt = this.orders.findIndex(
        o => o.type === 'NORMAL' || (o.type === 'VIP' && o.id > order.id)
      );
      this.orders.splice(insertAt === -1 ? this.orders.length : insertAt, 0, order);
    } else {
      // Place after all VIPs and any Normal with a lower id
      const insertAt = this.orders.findIndex(o => o.type === 'NORMAL' && o.id > order.id);
      this.orders.splice(insertAt === -1 ? this.orders.length : insertAt, 0, order);
    }
  }

  dequeue(): Order | undefined {
    return this.orders.shift();
  }

  get size(): number {
    return this.orders.length;
  }

  getAll(): Order[] {
    return [...this.orders];
  }
}
