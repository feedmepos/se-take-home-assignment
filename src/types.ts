export enum OrderType {
  NORMAL = "NORMAL",
  VIP = "VIP",
}

export enum OrderStatus {
  PENDING = "Pending",
  PROCESSING = "Processing",
  COMPLETE = "Complete",
}

export enum OutputType {
  FILE = "File",
  CONSOLE = "Console",
  BOTH = "Both",
}

export enum LogType {
  SYSTEM_INIT = "SYSTEM_INIT",
  BOT_CREATE = "BOT_CREATE",
  BOT_IDLE = "BOT_IDLE",
  BOT_DESTROY = "BOT_DESTROY",
  BOT_PROCESS = "BOT_PROCESS",
  BOT_COMPLETE = "BOT_COMPLETE",
  BOT_STOP = "BOT_STOP",
  ORDER_CREATE = "ORDER_CREATE",
}

export type LogParams = {
  bot_id: number;
  order_id: number;
  order_type: OrderType;
  order_status: OrderStatus;
};

export const OrderPriority: Record<OrderType, number> = {
  [OrderType.VIP]: 0,
  [OrderType.NORMAL]: 1,
};
