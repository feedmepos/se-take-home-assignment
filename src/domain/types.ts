export const ORDER_TYPES = {
  VIP: "VIP",
  NORMAL: "Normal",
} as const;

export type OrderType = (typeof ORDER_TYPES)[keyof typeof ORDER_TYPES];

export const ORDER_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETE: "COMPLETE",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const BOT_STATUS = {
  IDLE: "IDLE",
  PROCESSING: "PROCESSING",
} as const;

export type BotStatus = (typeof BOT_STATUS)[keyof typeof BOT_STATUS];

export interface Order {
  id: number;
  type: OrderType;
  status: OrderStatus;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
}

export interface Bot {
  id: number;
  status: BotStatus;
  currentOrder: Order | null;
  busyUntil: number | null;
  createdAt: number;
  lastIdleAnnouncement: number | null;
}

export interface OrderStats {
  createdVip: number;
  createdNormal: number;
  completedVip: number;
  completedNormal: number;
}
