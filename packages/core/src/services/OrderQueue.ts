import { OrderType } from '../types';
import type { Order } from '../models/Order';

/**
 * 优先级订单队列。内部分两段:VIP 段与普通段,各自 FIFO。
 * 出队时 VIP 段优先;退回(requeue)时插入对应段头部以保留其原有优先位置。
 */
export class OrderQueue {
  private readonly vip: Order[] = [];
  private readonly normal: Order[] = [];

  enqueue(order: Order): void {
    this.segmentFor(order).push(order);
  }

  dequeue(): Order | null {
    return this.vip.shift() ?? this.normal.shift() ?? null;
  }

  requeue(order: Order): void {
    this.segmentFor(order).unshift(order);
  }

  get size(): number {
    return this.vip.length + this.normal.length;
  }

  /** 当前等待中的订单,VIP 段在前,普通段在后。 */
  snapshot(): Order[] {
    return [...this.vip, ...this.normal];
  }

  private segmentFor(order: Order): Order[] {
    return order.type === OrderType.VIP ? this.vip : this.normal;
  }
}
