export type OrderType = 'NORMAL' | 'VIP';
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE';
export type BotStatus = 'IDLE' | 'PROCESSING';

export interface QueuePosition {
  queue: 'vip' | 'normal';
  index: number;
}

export interface Order {
  id: number;
  type: OrderType;
  status: OrderStatus;
  savedQueuePosition?: QueuePosition;
}

export interface Bot {
  id: number;
  status: BotStatus;
  currentOrder: Order | null;
  processingStartedAt: number | null;
}

export interface LogEntry {
  time: string;
  message: string;
}

export interface AppState {
  nextOrderId: number;
  nextBotId: number;
  vipQueue: Order[];
  normalQueue: Order[];
  bots: Bot[];
  completedOrders: Order[];
  eventLog: LogEntry[];
}

export const PROCESSING_TIME_MS = 10_000;
export const INITIAL_ORDER_ID = 1001;
