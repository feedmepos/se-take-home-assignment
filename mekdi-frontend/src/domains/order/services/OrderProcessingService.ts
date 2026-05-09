import { BotEntity, OrderEntity, OrderQueue } from '../entities'
import { OrderType } from '../types'

const PROCESSING_TIME_MS = 10000

export class OrderProcessingService {
  private orderQueue: OrderQueue
  private bots: BotEntity[] = []
  private nextBotId: number = 1
  private onOrderStateChange: (orderId: number) => void
  private onBotStatusChange: () => void

  constructor(
    orderQueue: OrderQueue,
    onOrderStateChange: (orderId: number) => void,
    onBotStatusChange: () => void
  ) {
    this.orderQueue = orderQueue
    this.onOrderStateChange = onOrderStateChange
    this.onBotStatusChange = onBotStatusChange
  }

  createNormalOrder(): OrderEntity {
    const order = this.orderQueue.createOrder(OrderType.NORMAL)
    this.processNextOrder()
    return order
  }

  createVipOrder(): OrderEntity {
    const order = this.orderQueue.createOrder(OrderType.VIP)
    this.processNextOrder()
    return order
  }

  addBot(): BotEntity {
    const bot = new BotEntity(this.nextBotId++)
    this.bots.push(bot)
    this.processNextOrder()
    this.onBotStatusChange()
    return bot
  }

  removeBot(): BotEntity | null {
    const busyBots = this.bots.filter(b => b.isBusy())
    const idleBots = this.bots.filter(b => b.isIdle())
    
    let botToRemove: BotEntity | null = null
    
    if (idleBots.length > 0) {
      botToRemove = idleBots[idleBots.length - 1]
    } else if (busyBots.length > 0) {
      botToRemove = busyBots[busyBots.length - 1]
      const interruptedOrderId = botToRemove.stopProcessing()
      if (interruptedOrderId !== null) {
        this.orderQueue.returnOrderToPending(interruptedOrderId)
      }
    }
    
    if (botToRemove) {
      this.bots = this.bots.filter(b => b.id !== botToRemove!.id)
      this.onBotStatusChange()
    }
    
    return botToRemove
  }

  private processNextOrder(): void {
    const availableBot = this.bots.find(b => b.isIdle())
    const nextOrder = this.orderQueue.getNextPendingOrder()
    
    if (availableBot && nextOrder) {
      this.startProcessing(availableBot, nextOrder)
    }
  }

  private startProcessing(bot: BotEntity, order: OrderEntity): void {
    this.orderQueue.markOrderProcessing(order.id)
    this.onOrderStateChange(order.id)
    
    const timeoutId = setTimeout(() => {
      this.completeOrder(bot, order.id)
    }, PROCESSING_TIME_MS)
    
    bot.startProcessing(order.id, timeoutId)
    this.onBotStatusChange()
  }

  private completeOrder(bot: BotEntity, orderId: number): void {
    bot.completeProcessing()
    this.orderQueue.completeOrder(orderId)
    this.onOrderStateChange(orderId)
    this.onBotStatusChange()
    this.processNextOrder()
  }

  getBots(): BotEntity[] {
    return this.bots.map(bot => bot.clone())
  }

  getIdleBotsCount(): number {
    return this.bots.filter(b => b.isIdle()).length
  }

  getBusyBotsCount(): number {
    return this.bots.filter(b => b.isBusy()).length
  }
}
