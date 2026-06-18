import type { BotStatus, OrderStatus } from './constants'

export type CustomerRole = 'vip' | 'normal'

export type { BotStatus, OrderStatus }

export interface Order {
  id: number
  role: CustomerRole
  status: OrderStatus
  sequence: number
  completedAt?: string
  completedAtMs?: number
}

export interface BotSnapshot {
  id: number
  status: BotStatus
  currentOrderId?: number
}

export interface BotStats {
  total: number
  idle: number
  processing: number
}

/** Processing order with bot assignment (for UI). */
export interface ProcessingOrderView {
  id: number
  role: CustomerRole
  botId: number
  startedAt: number
}

export interface KitchenSnapshot {
  orders: Order[]
  bots: BotSnapshot[]
  completed: Order[]
}
