import type { Order } from './Order.js';

export class PriorityQueue {
  private orders: Order[] = [];

  enqueue(order: Order): void {
    // 找到插入位置
    let insertIndex = this.orders.length;
    for (let i = 0; i < this.orders.length; i++) {
      const current = this.orders[i];
      // VIP 订单总是在普通订单前面
      if (order.type === 'vip' && current.type === 'normal') {
        insertIndex = i;
        break;
      }
      // 同类型订单按创建时间排序
      if (order.type === current.type && order.createdAt < current.createdAt) {
        insertIndex = i;
        break;
      }
    }
    this.orders.splice(insertIndex, 0, order);
  }

  dequeue(): Order | undefined {
    return this.orders.shift();
  }

  reinsert(order: Order): void {
    this.enqueue(order);
  }

  get size(): number {
    return this.orders.length;
  }

  getAll(): Order[] {
    return [...this.orders];
  }

  getVipOrders(): Order[] {
    return this.orders.filter(o => o.type === 'vip');
  }

  getNormalOrders(): Order[] {
    return this.orders.filter(o => o.type === 'normal');
  }
}
