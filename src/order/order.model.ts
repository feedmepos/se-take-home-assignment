export type OrderType = 'normal' | 'vip';

export type OrderStatus = 'pending' | 'processing' | 'complete';

export interface Order {
  id: number;
  type: OrderType;
  status: OrderStatus;
}
