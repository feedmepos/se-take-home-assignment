export type OrderType = 'NORMAL' | 'VIP';

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE';

export interface Order {
  id: number;
  type: OrderType;
  status: OrderStatus;
  /** Epoch ms when the order was created. */
  createdAt: number;
  /** Epoch ms when a bot started cooking it. */
  startedAt?: number;
  /** Epoch ms when cooking finished. */
  completedAt?: number;
  /** Id of the bot currently cooking it, if any. */
  botId?: number;
}

export interface Bot {
  id: number;
  /** Id of the order being cooked, or null when the bot is IDLE. */
  orderId: number | null;
}

export interface SystemState {
  orders: Order[];
  bots: Bot[];
  nextOrderId: number;
  nextBotId: number;
}
