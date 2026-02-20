import { OrderType, OrderStatus, OrderPriority } from "../types";

const { PENDING, PROCESSING, COMPLETE } = OrderStatus;

export class Order {
  // constructure：id, type
  // getter: status()
  // methods：process(), complete(), reset()

  static completedCount: number = 0;
  static countByType: Record<OrderType, number> = {
    [OrderType.VIP]: 0,
    [OrderType.NORMAL]: 0,
  };

  static get totalCount(): number {
    return Object.values(Order.countByType).reduce((sum, count) => sum + count, 0);
  }

  private _status: OrderStatus = PENDING;

  constructor(
    public readonly id: number,
    public readonly type: OrderType,
  ) {
    Order.countByType[type]++;
  }

  get status(): OrderStatus {
    return this._status;
  }

  get priority(): number {
    return OrderPriority[this.type];
  }

  process(): void {
    this._status = PROCESSING;
  }

  complete(): void {
    this._status = COMPLETE;
    Order.completedCount++;
  }

  reset(): void {
    this._status = PENDING;
  }
}
