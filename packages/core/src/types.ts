/** 订单类型:普通 / VIP(VIP 拥有更高调度优先级)。 */
export enum OrderType {
  NORMAL = 'NORMAL',
  VIP = 'VIP',
}

/** 订单生命周期状态。 */
export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETE = 'COMPLETE',
}

/** 机器人状态。 */
export enum BotStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
}

/** 单个订单处理耗时(毫秒)。需求规定为 10 秒。 */
export const PROCESSING_DURATION_MS = 10_000;
