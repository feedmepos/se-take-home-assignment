export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE';

export interface Order {
  id: number;
  isVip: boolean;
  status: OrderStatus;
}
