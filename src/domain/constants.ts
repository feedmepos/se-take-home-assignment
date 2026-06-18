import type { CustomerRole } from './types'

export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETE: 'complete',
} as const

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS]

export const BOT_STATUS = {
  IDLE: 'idle',
  PROCESSING: 'processing',
} as const

export type BotStatus = (typeof BOT_STATUS)[keyof typeof BOT_STATUS]

export const ROLE_PRIORITY: Record<CustomerRole, number> = {
  vip: 1,
  normal: 2,
}

export const ROLE_LABEL: Record<CustomerRole, string> = {
  vip: 'VIP',
  normal: 'Normal',
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  [ORDER_STATUS.PENDING]: '待处理',
  [ORDER_STATUS.PROCESSING]: '处理中',
  [ORDER_STATUS.COMPLETE]: '已完成',
}

export const PROCESSING_SECONDS = 10
export const INITIAL_ORDER_ID = 1001
