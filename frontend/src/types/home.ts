export type OrderType = "NORMAL" | "VIP";
export type OrderStatus = "PENDING" | "PROCESSING" | "COMPLETE";
export type BotStatus = "IDLE" | "WORKING";

export interface Order {
  id: number;
  type: OrderType;
  status: OrderStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}
interface Bot {
  id: number;
  status: BotStatus;
  orderId?: number;
  startedAt?: number;
  endsAt?: number;
}

export interface OrderState {
  nextOrderId: number;
  nextBotId: number;
  ordersById: Record<number, Order>;
  pendingOrderIds: number[];
  completeOrderIds: number[];
  bots: Bot[];
}

export type Action =
  | { type: "ADD_ORDER"; orderType: OrderType; now: number }
  | { type: "ADD_BOT"; now: number }
  | { type: "REMOVE_NEWEST_BOT"; now: number }
  | { type: "COMPLETE_ORDER"; botId: number; now: number };

export interface HomeBoardProps {
  state: OrderState;
  now: number | null;
}
