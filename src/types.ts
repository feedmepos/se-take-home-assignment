export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE'

export type CustomerType = 'NORMAL' | 'VIP'

export interface Order {
  id: number
  customerType: CustomerType
  status: OrderStatus
  submitTime: number
  completeTime?: number
  botId?: number
}

export interface Bot {
  id: number
  status: 'IDLE' | 'PROCESSING'
  orderId?: number
}
