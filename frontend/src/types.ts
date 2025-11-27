export type OrderType = 'VIP' | 'Normal'

export interface Order {
  id: number
  type: OrderType
  createdAt: number
  startedAt?: number
  completedAt?: number
}

export interface Bot {
  id: number
  status: 'IDLE' | 'WORKING'
  currentOrder?: Order
  timer?: ReturnType<typeof setTimeout>
}
