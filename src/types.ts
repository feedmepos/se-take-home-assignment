export type OrderType = 'normal' | 'vip'

export interface Order {
  id: number
  type: OrderType
}

export type BotStatus = 'idle' | 'processing'

export interface Bot {
  id: number
  status: BotStatus
  currentOrderId: number | null
  originalPendingIndex: number | null
}

export interface OrderSystemState {
  pendingOrders: Order[]
  completeOrders: Order[]
  bots: Bot[]
  nextOrderId: number
}
