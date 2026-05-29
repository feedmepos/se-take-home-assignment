/**
 * 订单类型定义
 */
export type OrderType = 'NORMAL' | 'VIP';

/**
 * 订单状态定义
 */
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE';

/**
 * 订单接口
 */
export interface Order {
  id: number;
  type: OrderType;
  status: OrderStatus;
  createdAt: number;
  requeuedAt?: number; // 用于将订单移回队列头部
}

/**
 * 机器人状态定义
 */
export type BotStatus = 'IDLE' | 'WORKING';

/**
 * 机器人接口
 */
export interface Bot {
  id: number;
  status: BotStatus;
  processingOrderId?: number;
  startTime?: number;
  endTime?: number;
}
