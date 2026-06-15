export type OrderType = "NORMAL" | "VIP";
export type BotStatus = "IDLE" | "PROCESSING";

export interface Order {
  id: number;
  type: OrderType;
}

export interface CompletedOrder extends Order {
  completedAt: string;
}

export type OrderCompletedListener = (order: CompletedOrder) => void;
export type OrderStartedListener = (botId: number, order: Order) => void;
export type BotIdleListener = (botId: number) => void;

export interface BotSnapshot {
  id: number;
  status: BotStatus;
  currentOrder: Order | null;
}

export interface ActiveBot {
  id: number;
  currentOrder: Order | null;
  timerHandle: TimerHandle | null;
}

export interface ControllerStatus {
  pendingOrders: Order[];
  completedOrders: CompletedOrder[];
  bots: BotSnapshot[];
}

export interface TimerHandle {
  id: number;
  reference?: ReturnType<typeof setTimeout>;
}

export interface TimerAdapter {
  schedule(callback: () => void, delayMs: number): TimerHandle;
  cancel(handle: TimerHandle): void;
}

export interface OrderControllerOptions {
  processingTimeMs?: number;
  timerAdapter?: TimerAdapter;
  now?: () => Date;
  onOrderCompleted?: OrderCompletedListener;
  onOrderStarted?: OrderStartedListener;
  onBotIdle?: BotIdleListener;
}
