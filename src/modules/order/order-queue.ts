import { Order, OrderType } from '../../interface/order'
import { logLine } from '../../utils/logger'

export class OrderQueue {
  private vipQueue: Order[] = []
  private normalQueue: Order[] = []
  private nextOrderId = 1

  createOrder(type: OrderType): Order {
    const order: Order = {
      id: this.nextOrderId++,
      type,
      createdAt: Date.now(),
    }

    if (type === 'VIP') this.vipQueue.push(order)
    else this.normalQueue.push(order)

    logLine(`New ${type} order #${order.id} -> PENDING`)
    return order
  }

  dequeue(): Order | undefined {
    if (this.vipQueue.length > 0) return this.vipQueue.shift()
    if (this.normalQueue.length > 0) return this.normalQueue.shift()
    return undefined
  }

  requeue(order: Order) {
    if (order.type === 'VIP') this.vipQueue.unshift(order)
    else this.normalQueue.unshift(order)
    logLine(`Order #${order.id} returned to PENDING`)
  }

  pendingCounts() {
    return { vip: this.vipQueue.length, normal: this.normalQueue.length }
  }
}
