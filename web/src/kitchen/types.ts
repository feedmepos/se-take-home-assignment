export type OrderType = "VIP" | "NORMAL";

export interface Order {
  id: number;
  type: OrderType;
}

export type BotStatus = "IDLE" | "PROCESSING";

export interface ActiveCook {
  order: Order;
  tier: OrderType;
  /** Index within VIP or NORMAL queue at pickup time (FIFO head is always 0). */
  reinsertIdx: number;
}

export interface Bot {
  id: number;
  status: BotStatus;
  cook?: ActiveCook;
}

export interface KitchenSnapshot {
  nextOrderId: number;
  nextBotId: number;
  vip: Order[];
  normal: Order[];
  bots: Bot[];
  completed: Order[];
}
