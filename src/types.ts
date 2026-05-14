export type OrderType = 'VIP' | 'NORMAL';
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE';

export interface Order {
  readonly id: number;
  readonly type: OrderType;
  status: OrderStatus;
}
