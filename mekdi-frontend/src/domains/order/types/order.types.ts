export enum OrderType {
  NORMAL = 'NORMAL',
  VIP = 'VIP'
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETE = 'COMPLETE'
}

export interface Order {
  id: number
  type: OrderType
  status: OrderStatus
  createdAt: Date
}
