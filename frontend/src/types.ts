export type OrderType = 'NORMAL' | 'VIP';
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE';

export interface Order {
  id: number;
  type: OrderType;
  status: OrderStatus;
  createdAt: number;
  completedAt?: number;
}

export interface Bot {
  id: number;
  orderId: number | null; // null if IDLE
  processingStartTime: number | null;
  isVip?: boolean;
}
