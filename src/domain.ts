type Brand<TValue, TBrand extends string> = TValue & { readonly __brand: TBrand };

export type OrderId = Brand<number, "OrderId">;
export type BotId = Brand<number, "BotId">;
export type Seconds = Brand<number, "Seconds">;

export const ORDER_TYPES = {
  NORMAL: "NORMAL",
  VIP: "VIP",
} as const;

export const BOT_STATUS = {
  IDLE: "IDLE",
  PROCESSING: "PROCESSING",
} as const;

export const ORDER_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETE: "COMPLETE",
} as const;

export type OrderType = (typeof ORDER_TYPES)[keyof typeof ORDER_TYPES];
export type BotStatus = (typeof BOT_STATUS)[keyof typeof BOT_STATUS];
export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export interface OrderControllerOptions {
  processingSeconds?: number;
  startTime?: string;
  firstOrderId?: number;
}

export interface OrderSnapshot {
  id: OrderId;
  type: OrderType;
  status: OrderStatus;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface ProcessingOrderSnapshot {
  botId: BotId;
  order: OrderSnapshot;
  remainingSeconds: number;
}

interface BaseBotSnapshot {
  id: BotId;
  status: BotStatus;
  remainingSeconds: number;
}

export interface IdleBotSnapshot extends BaseBotSnapshot {
  status: typeof BOT_STATUS.IDLE;
  orderId: null;
  orderType: null;
}

export interface ProcessingBotSnapshot extends BaseBotSnapshot {
  status: typeof BOT_STATUS.PROCESSING;
  orderId: OrderId;
  orderType: OrderType;
}

export type BotSnapshot = IdleBotSnapshot | ProcessingBotSnapshot;

export interface ControllerSnapshot {
  time: string;
  pendingOrders: OrderSnapshot[];
  processingOrders: ProcessingOrderSnapshot[];
  completedOrders: OrderSnapshot[];
  bots: BotSnapshot[];
}

export function toOrderId(value: number): OrderId {
  return value as OrderId;
}

export function toBotId(value: number): BotId {
  return value as BotId;
}
