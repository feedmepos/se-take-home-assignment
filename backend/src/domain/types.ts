export type OrderType = 'NORMAL' | 'VIP';
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE';
export type BotStatus = 'IDLE' | 'PROCESSING';

export interface Order { id: number; type: OrderType; status: OrderStatus; createdAt: Date; completedAt?: Date; }
export interface Bot { id: number; status: BotStatus; currentOrderId: number | null; }

export type DomainEvent =
  | { type: 'OrderCreated'; order: Order; at: Date }
  | { type: 'OrderStarted'; orderId: number; botId: number; at: Date }
  | { type: 'OrderCompleted'; orderId: number; botId: number; at: Date }
  | { type: 'OrderRequeued'; orderId: number; botId: number; at: Date }
  | { type: 'BotAdded'; botId: number; at: Date }
  | { type: 'BotRemoved'; botId: number; at: Date }
  | { type: 'BotIdle'; botId: number; at: Date };

export interface StatusSnapshot {
  pending: Order[];
  processing: { order: Order; botId: number }[];
  complete: Order[];
  bots: Bot[];
}
