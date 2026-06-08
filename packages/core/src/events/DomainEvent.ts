import type { OrderStatus, OrderType, BotStatus } from '../types';

/** 可序列化的订单视图,用于事件载荷与状态推送。 */
export interface OrderSnapshot {
  id: number;
  type: OrderType;
  status: OrderStatus;
  createdAt: number;
  completedAt: number | null;
}

/** 可序列化的机器人视图。 */
export interface BotSnapshot {
  id: number;
  status: BotStatus;
  currentOrderId: number | null;
  /** 该机器人完成单个订单所需的整体时间(毫秒)。 */
  processingTime: number;
}

/** 系统全量状态快照,WS 首次连接与刷新时下发。 */
export interface StateSnapshot {
  pending: OrderSnapshot[];
  processing: OrderSnapshot[];
  complete: OrderSnapshot[];
  bots: BotSnapshot[];
}

/**
 * 领域事件。Kitchen 在状态变更时产出,
 * 由 server 转为 WS 推送、由 cli 转为 result.txt 日志行 —— 同一事件流,多种渲染。
 */
export type DomainEvent =
  | { kind: 'OrderCreated'; at: number; order: OrderSnapshot }
  | { kind: 'OrderPickedUp'; at: number; orderId: number; botId: number }
  | { kind: 'OrderCompleted'; at: number; orderId: number; botId: number }
  | { kind: 'OrderRequeued'; at: number; orderId: number; botId: number }
  | { kind: 'BotAdded'; at: number; botId: number }
  | { kind: 'BotRemoved'; at: number; botId: number };

export type DomainEventKind = DomainEvent['kind'];

export type DomainEventListener = (event: DomainEvent) => void;
