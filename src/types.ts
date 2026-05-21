export enum OrderType {
  NORMAL = 'NORMAL',
  VIP = 'VIP'
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETE = 'COMPLETE'
}

export interface Order {
  id: number;
  type: OrderType;
  status: OrderStatus;
  createdAt: Date;
  completedAt?: Date;
}

export enum BotStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING'
}

export interface Bot {
  id: number;
  status: BotStatus;
  currentOrderId: number | null;
}
