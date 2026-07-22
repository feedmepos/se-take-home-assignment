export type OrderType = "normal" | "vip";

export type BotStatus = "idle" | "processing";

export interface Order {
  id: number;
  type: OrderType;
  createdAt: Date;
  completedAt?: Date;
}

export interface Bot {
  id: number;
  status: BotStatus;
  order: Order | null;
  startTime: number | null;
  progress: number;
}

/** Processing time per order in milliseconds. */
export const PROCESSING_TIME_MS = 10_000;
