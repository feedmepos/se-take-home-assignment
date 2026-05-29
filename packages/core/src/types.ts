export type OrderPriority = "normal" | "vip";
export type OrderStatus = "pending" | "processing" | "complete";
export type BotStatus = "idle" | "processing";

export interface Order {
  id: number;
  priority: OrderPriority;
  status: OrderStatus;
  createdAt: number;
  processingStartedAt?: number;
  completedAt?: number;
  assignedBotId?: number;
}

export interface Bot {
  id: number;
  status: BotStatus;
  createdAt: number;
  lastUpdatedAt: number;
  currentOrderId?: number;
  completedOrders: number;
}

export interface Metrics {
  pendingCount: number;
  processingCount: number;
  completedCount: number;
  activeBotCount: number;
  idleBotCount: number;
  vipPendingCount: number;
  normalPendingCount: number;
  vipCompletedCount: number;
  normalCompletedCount: number;
  totalOrdersCreated: number;
  averageProcessingTimeSeconds: number;
  botUtilizationRate: number;
  ordersCompletedPerMinute: number;
}

export interface SystemSnapshot {
  serverTime: number;
  processDurationMs: number;
  pendingOrders: Order[];
  processingOrders: Order[];
  completedOrders: Order[];
  bots: Bot[];
  metrics: Metrics;
}

export type DomainEventType =
  | "order.created"
  | "order.requeued"
  | "order.assigned"
  | "order.completed"
  | "bot.added"
  | "bot.removed"
  | "bot.idle";

export interface DomainEvent {
  id: number;
  type: DomainEventType;
  timestamp: number;
  message: string;
  payload?: Record<string, string | number | boolean | undefined>;
  snapshot: SystemSnapshot;
}

export interface DispatchAssignment {
  botId: number;
  orderId: number;
}

export interface DispatchContext {
  idleBots: readonly Bot[];
  pendingOrders: readonly Order[];
}

export interface DispatchPolicy {
  selectAssignments(context: DispatchContext): DispatchAssignment[];
}

export type OrderQueueComparator = (left: Order, right: Order) => number;

export type ProcessingDurationResolver = (order: Order, bot: Bot) => number;

export interface ControllerConfig {
  processDurationMs?: number;
  initialOrderId?: number;
  dispatchPolicy?: DispatchPolicy;
  maxEventHistory?: number;
  orderQueueComparator?: OrderQueueComparator;
  processingDurationResolver?: ProcessingDurationResolver;
}
