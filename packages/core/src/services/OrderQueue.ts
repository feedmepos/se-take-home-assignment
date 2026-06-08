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

  /** 查看队首订单(VIP 段优先)而不出队 —— 供调度在「最优 bot 尚忙」时保留订单。 */
  peek(): Order | null {
    return this.vip[0] ?? this.normal[0] ?? null;
  }

  requeue(order: Order): void {
    this.segmentFor(order).unshift(order);
  }

  /** 当前等待中的 VIP 订单(按 FIFO 顺序)。 */
  get vipPending(): readonly Order[] {
    return this.vip;
  }

  /** 当前等待中的普通订单(按 FIFO 顺序)。 */
  get normalPending(): readonly Order[] {
    return this.normal;
  }

  /** 是否仍有等待中的 VIP —— 调度据此严格保持 VIP 优先于 Normal。 */
  hasVip(): boolean {
    return this.vip.length > 0;
  }

  /** 从队列移除指定订单(可为队列中任意位置) —— 供最优分配取出非队首的 VIP。 */
  remove(order: Order): void {
    const segment = this.segmentFor(order);
    const index = segment.indexOf(order);
    if (index !== -1) segment.splice(index, 1);
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
