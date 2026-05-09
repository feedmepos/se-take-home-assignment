import { OrderType } from '../types'
import { OrderEntity } from './OrderEntity'

export class OrderQueue {
  private orders: OrderEntity[] = []
  private nextOrderId: number = 1

  createOrder(type: OrderType): OrderEntity {
    const order = new OrderEntity(this.nextOrderId++, type)
    this.insertOrderByPriority(order)
    return order
  }

  private insertOrderByPriority(order: OrderEntity): void {
    const pendingOrders = this.orders.filter(o => o.isPending())
    
    if (order.type === OrderType.VIP) {
      const lastVipIndex = pendingOrders.reduce((lastIndex, o, index) => 
        o.type === OrderType.VIP ? index : lastIndex, -1)
      
      if (lastVipIndex === -1) {
        this.orders.unshift(order)
      } else {
        const insertIndex = this.orders.findIndex(o => o.id === pendingOrders[lastVipIndex].id) + 1
        this.orders.splice(insertIndex, 0, order)
      }
    } else {
      this.orders.push(order)
    }
  }

  getPendingOrders(): OrderEntity[] {
    return this.orders.filter(o => o.isPending())
  }

  getCompleteOrders(): OrderEntity[] {
    return this.orders.filter(o => o.isComplete())
  }

  getProcessingOrders(): OrderEntity[] {
    return this.orders.filter(o => o.isProcessing())
  }

  getNextPendingOrder(): OrderEntity | null {
    const pending = this.getPendingOrders()
    return pending.length > 0 ? pending[0] : null
  }

  findOrderById(id: number): OrderEntity | undefined {
    return this.orders.find(o => o.id === id)
  }

  returnOrderToPending(orderId: number): void {
    const order = this.findOrderById(orderId)
    if (order && order.isProcessing()) {
      order.returnToPending()
      this.reorderByPriority()
    }
  }

  private reorderByPriority(): void {
    const processingOrders = this.orders.filter(o => o.isProcessing())
    const pendingOrders = this.orders.filter(o => o.isPending())
    const completeOrders = this.orders.filter(o => o.isComplete())
    
    pendingOrders.sort((a, b) => {
      if (a.type === b.type) {
        return a.createdAt.getTime() - b.createdAt.getTime()
      }
      return a.type === OrderType.VIP ? -1 : 1
    })
    
    this.orders = [...pendingOrders, ...processingOrders, ...completeOrders]
  }

  getAllOrders(): OrderEntity[] {
    return [...this.orders]
  }

  completeOrder(orderId: number): void {
    const order = this.findOrderById(orderId)
    if (order) {
      order.complete()
      this.reorderByPriority()
    }
  }

  markOrderProcessing(orderId: number): void {
    const order = this.findOrderById(orderId)
    if (order) {
      order.startProcessing()
    }
  }
}
