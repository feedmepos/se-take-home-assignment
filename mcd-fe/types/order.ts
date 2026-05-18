export type OrderType = 'NORMAL' | 'VIP';

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE';

export interface Order {
  id: number;
  type: OrderType;
  status: OrderStatus;
  createdAt: Date;
}

export type BotStatus = 'IDLE' | 'PROCESSING';

export interface Bot {
  id: number;
  status: BotStatus;
  currentOrder?: Order;
  processingStartTime?: Date;
}
