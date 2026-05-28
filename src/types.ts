export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE'
export type OrderType = 'NORMAL' | 'VIP'
export type BotStatus = 'IDLE' | 'PROCESSING'

export interface Order {
  id: number
  type: OrderType
  status: OrderStatus
}

export interface Bot {
  id: number
  status: BotStatus
  currentOrderId: number | null
}
