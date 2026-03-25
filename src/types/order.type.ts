export type OrderType = 'VIP' | 'Normal';
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE';

export type LogCallback = (message: string) => void;

export interface Order {
  id: number;
  type: OrderType;
  status: OrderStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface OrderStats {
  totalOrders: number;
  vipOrders: number;
  normalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  activeBots: number;
}
