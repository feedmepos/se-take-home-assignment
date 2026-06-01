import { OrderStatus, OrderType } from '../types';

/**
 * 订单实体。状态迁移内聚于实体内部,外部不可直接修改 status,
 * 保证生命周期 PENDING → PROCESSING → COMPLETE 的一致性。
 */
export class Order {
  private _status: OrderStatus = OrderStatus.PENDING;
  private _completedAt: number | null = null;

  constructor(
    readonly id: number,
    readonly type: OrderType,
    readonly createdAt: number,
  ) {}

  get status(): OrderStatus {
    return this._status;
  }

  get completedAt(): number | null {
    return this._completedAt;
  }

  markProcessing(): void {
    this._status = OrderStatus.PROCESSING;
  }

  markPending(): void {
    this._status = OrderStatus.PENDING;
  }

  markComplete(at: number): void {
    this._status = OrderStatus.COMPLETE;
    this._completedAt = at;
  }
}
