export type OrderType = 'NORMAL' | 'VIP';
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE';

export interface Order {
  id: number;
  type: OrderType;
  status: OrderStatus;
  createdAt: Date;
  completedAt?: Date;
}

export interface Bot {
  id: number;
  status: 'IDLE' | 'PROCESSING';
  currentOrderId?: number;
  processingStartTime?: Date;
}

export interface SystemState {
  orders: Order[];
  bots: Bot[];
  nextOrderId: number;
  nextBotId: number;
}
