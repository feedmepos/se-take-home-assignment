export type OrderType = 'NORMAL' | 'VIP';
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE';

export interface Order {
  id: number;
  type: OrderType;
  status: OrderStatus;
  createdAt: string;
  completedAt?: string;
}

export interface CreateOrderRequest {
  type: OrderType;
}

export interface CreateOrderResponse {
  order: Order;
}
