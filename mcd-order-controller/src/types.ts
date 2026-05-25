export type OrderType = "VIP" | "NORMAL";

export type OrderStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETE";

export interface Order {
  id: number;
  type: OrderType;
  status: OrderStatus;
}

export interface Bot {
  id: number;
  processingOrder: Order | null;
  timeoutId?: number;
}