/** 订单类型 */
export type OrderType = 'NORMAL' | 'VIP'

/** 订单状态 */
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE'

/** 订单 */
export interface Order {
  id: string
  type: OrderType
  status: OrderStatus
  bot_id: string | null
  created_at: string
  processing_at: string | null
  completed_at: string | null
}

/** Bot 状态 */
export type BotStatus = 'IDLE' | 'ACTIVE'

/** Bot */
export interface Bot {
  bot_id: string
  status: BotStatus
  processing_order_id: string | null
  created_at: string
}

/** 系统状态 */
export interface SystemStatus {
  total_orders: number
  pending: number
  processing: number
  complete: number
  active_bots: number
  idle_bots: number
}

/** WebSocket 事件类型 */
export type EventType =
  | 'order_created'
  | 'order_processing'
  | 'order_complete'
  | 'order_returned'
  | 'bot_created'
  | 'bot_destroyed'
  | 'bot_idle'
  | 'system_reset'

/** WebSocket 事件 */
export interface WsEvent {
  type: EventType
  timestamp: string
  data: unknown
}

/** API 通用响应 */
export interface ApiResponse<T> {
  success: boolean
  data: T
}

/** REST API 响应的订单 */
export interface OrderResponse {
  id: string
  type: OrderType
  status: OrderStatus
  bot_id: string | null
  created_at: string
  processing_at: string | null
  completed_at: string | null
}

/** REST API 响应的 Bot */
export interface BotResponse {
  bot_id: string
  status: BotStatus
}
