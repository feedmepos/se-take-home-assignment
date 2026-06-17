export type OrderType = 'NORMAL' | 'VIP'
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE'

export interface Order {
  id: number
  type: OrderType
  status: OrderStatus
  createdAt: number
  completedAt?: number
  botId?: number
}

export type BotStatus = 'IDLE' | 'BUSY'

export interface Bot {
  id: number
  status: BotStatus
  orderId?: number
  startedAt?: number
}
