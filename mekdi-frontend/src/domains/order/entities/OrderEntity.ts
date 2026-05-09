import { Order, OrderType, OrderStatus } from '../types'

export class OrderEntity implements Order {
  id: number
  type: OrderType
  status: OrderStatus
  createdAt: Date

  constructor(id: number, type: OrderType) {
    this.id = id
    this.type = type
    this.status = OrderStatus.PENDING
    this.createdAt = new Date()
  }

  getPriority(): number {
    return this.type === OrderType.VIP ? 1 : 2
  }

  startProcessing(): void {
    this.status = OrderStatus.PROCESSING
  }

  complete(): void {
    this.status = OrderStatus.COMPLETE
  }

  returnToPending(): void {
    this.status = OrderStatus.PENDING
  }

  isPending(): boolean {
    return this.status === OrderStatus.PENDING
  }

  isProcessing(): boolean {
    return this.status === OrderStatus.PROCESSING
  }

  isComplete(): boolean {
    return this.status === OrderStatus.COMPLETE
  }
}
