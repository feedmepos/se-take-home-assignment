export type Role = 'CUSTOMER' | 'MANAGER'

export type OrderType = 'NORMAL' | 'VIP'

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE'

export type BotStatus = 'IDLE' | 'PROCESSING'

export type Order = {
  id: number
  type: OrderType
  status: OrderStatus
  createdAt: number
  startedAt?: number
  completedAt?: number
}

export type Bot = {
  id: number
  status: BotStatus
  currentOrderId?: number
  startedAt?: number
}

export type OrderControllerState = {
  orders: Order[]
  bots: Bot[]
  nextOrderId: number
  nextBotId: number
}
