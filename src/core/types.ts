export type OrderType = "VIP" | "NORMAL";
export type OrderStatus = "PENDING" | "PROCESSING" | "COMPLETE";
export type BotStatus = "IDLE" | "PROCESSING";

export interface Order {
  readonly id: number;
  readonly type: OrderType;
  readonly status: OrderStatus;
  readonly createdAt: number;
  readonly completedAt?: number;
}

export interface Bot {
  readonly id: number;
  readonly status: BotStatus;
  readonly currentOrderId?: number;
  readonly processingEndsAt?: number;
}

export interface Snapshot {
  readonly pending: readonly Order[];
  readonly complete: readonly Order[];
  readonly bots: readonly Bot[];
}
