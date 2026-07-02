export type OrderType = "NORMAL" | "VIP";
export type OrderStatus = "PENDING" | "PROCESSING" | "COMPLETE";
export type BotStatus = "IDLE" | "ACTIVE";

export interface Order {
  id: number;
  type: OrderType;
  status: OrderStatus;
}

export interface Bot {
  id: number;
  status: BotStatus;
  currentOrder: Order | null;
  timerHandle: SchedulerHandle | null;
}

export interface Scheduler {
  schedule(callback: () => void, ms: number): SchedulerHandle;
}

export interface SchedulerHandle {
  clear(): void;
}

export interface OrderControllerSnapshot {
  pending: { id: number; type: OrderType }[];
  processing: { botId: number; orderId: number }[];
  complete: { id: number; type: OrderType }[];
  bots: { id: number; status: BotStatus; currentOrderId: number | null }[];
}
