export type OrderType = "VIP" | "NORMAL";

export interface Order {
  id: number;
  type: OrderType;
  createdAt: Date;
  completedAt: Date | null;
}

export interface Bot {
  id: number;
  status: "IDLE" | "PROCESSING";
  order: Order | null;
}

export interface State {
  pendingOrders: Order[];
  completeOrders: Order[];
  bots: Bot[];
  nextOrderId: number;
}

export type Action =
  | { type: "ADD_ORDER"; orderType: OrderType; timestamp: Date }
  | { type: "ADD_BOT" }
  | { type: "REMOVE_BOT" }
  | { type: "COMPLETE_ORDER"; botId: number; timestamp: Date };
