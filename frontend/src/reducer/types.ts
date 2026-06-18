export type OrderType = "NORMAL" | "VIP";
export type OrderStatus = "PENDING" | "PROCESSING" | "COMPLETE";
export type BotStatus = "IDLE" | "PROCESSING";

export interface Order {
  id: number;
  type: OrderType;
  status: OrderStatus;
  createdAt: number;
  startedAt?: number;
}

export interface Bot {
  id: number;
  status: BotStatus;
  processingOrderId?: number;
  createdAt: number;
}

export interface AppState {
  orders: Order[];
  bots: Bot[];
  nextOrderId: number;
  nextBotId: number;
}

export type Action =
  | { type: "ADD_NORMAL_ORDER" }
  | { type: "ADD_VIP_ORDER" }
  | { type: "ADD_BOT" }
  | { type: "REMOVE_BOT" }
  | { type: "ORDER_COMPLETE"; botId: number };
