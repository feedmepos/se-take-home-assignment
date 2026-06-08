import type { StateSnapshot, DomainEvent } from './events/DomainEvent';

/** 命令请求中表达的订单类型(REST body)。 */
export type OrderTypeCommand = 'NORMAL' | 'VIP';

/**
 * 服务端经 WebSocket 推送给客户端的消息。
 * - STATE:全量状态快照(连接建立时、以及每次事件后下发,保证前端最终一致)。
 * - EVENT:单条领域事件(用于前端做动效 / 提示)。
 */
export type ServerMessage =
  | { type: 'STATE'; payload: StateSnapshot }
  | { type: 'EVENT'; payload: DomainEvent };
