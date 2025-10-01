import { OrderType } from '../../interface/order'
import { BotManager } from '../bot/bot-manager'
import { OrderQueue } from './order-queue'

export class OrderController {
  private queue = new OrderQueue()
  private bots = new BotManager(this.queue)

  createOrder(kind: OrderType) {
    this.queue.createOrder(kind)
    this.bots.scheduleAll()
  }

  createBot() {
    this.bots.createBot()
  }

  removeBot() {
    this.bots.deleteBot()
  }

  stats() {
    return {
      bots: this.bots.botCount(),
      busy: this.bots.busyCount(),
      pending: this.queue.pendingCounts(),
    }
  }
}
