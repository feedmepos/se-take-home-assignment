import { Order, OrderStatus, OrderType } from '../../domain/orders/order.entity';
import { OrderRepository } from '../../domain/orders/order.repository';

export class InMemoryOrderRepository implements OrderRepository {
  private orders: Order[] = [];
  private nextOrderId = 1;
  private readonly maxOrders = 10000;

  nextId(): number {
    if (this.nextOrderId > Number.MAX_SAFE_INTEGER - 1000) {
      this.nextOrderId = 1;
    }
    return this.nextOrderId++;
  }

  save(order: Order): void {
    this.orders.push(order);
  }

  update(order: Order): void {
    const idx = this.orders.findIndex(o => o.id === order.id);
    if (idx >= 0) this.orders[idx] = order;
  }

  findAll(): Order[] {
    return [...this.orders];
  }

  findById(id: number): Order | undefined {
    return this.orders.find(o => o.id === id);
  }

  getByStatus(status: OrderStatus): Order[] {
    return this.orders.filter(o => o.status === status);
  }

  getNextPendingByPriority(): Order | null {
    const pending = this.getByStatus(OrderStatus.PENDING);
    const vip = pending.find(o => o.type === OrderType.VIP);
    if (vip) return vip;
    const normal = pending.find(o => o.type === OrderType.NORMAL);
    return normal ?? null;
  }

  getStats(): { total: number; pending: number; processing: number; complete: number } {
    return {
      total: this.orders.length,
      pending: this.getByStatus(OrderStatus.PENDING).length,
      processing: this.getByStatus(OrderStatus.PROCESSING).length,
      complete: this.getByStatus(OrderStatus.COMPLETE).length,
    };
  }

  cleanupCompleted(): number {
    const completed = this.getByStatus(OrderStatus.COMPLETE);
    const toKeep = completed.slice(-100);
    const before = this.orders.length;
    this.orders = this.orders.filter(o => o.status !== OrderStatus.COMPLETE || toKeep.includes(o));
    return before - this.orders.length;
  }

  validateIntegrity(): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    const ids = this.orders.map(o => o.id);
    if (new Set(ids).size !== ids.length) issues.push('Duplicate order IDs found');
    const invalid = this.orders.filter(o => !Object.values(OrderStatus).includes(o.status));
    if (invalid.length > 0) issues.push(`${invalid.length} orders with invalid status`);

    const stuck = this.orders.filter(o => {
      if (o.status === OrderStatus.PROCESSING && o.processingStartedAt) {
        return Date.now() - o.processingStartedAt.getTime() > 15000;
      }
      return false;
    });
    if (stuck.length > 0) issues.push(`${stuck.length} orders stuck in processing state`);

    return { isValid: issues.length === 0, issues };
  }

  resetStuck(): number {
    const stuck = this.orders.filter(o => {
      if (o.status === OrderStatus.PROCESSING && o.processingStartedAt) {
        return Date.now() - o.processingStartedAt.getTime() > 15000;
      }
      return false;
    });
    stuck.forEach(o => o.resetToPending());
    return stuck.length;
  }
}


