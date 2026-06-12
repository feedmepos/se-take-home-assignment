export const PROCESSING_MS = 10_000

export type OrderType = 'VIP' | 'NORMAL'
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE'
export type BotStatus = 'IDLE' | 'PROCESSING'

export interface Order {
  id: number
  type: OrderType
  status: OrderStatus
  createdAt: number
  cookingStartedAt: number | null
  completedAt: number | null
  cookingBotId: number | null
  cancelCount: number
}

export interface Bot {
  id: number
  status: BotStatus
  currentOrder: Order | null
  timerId: ReturnType<typeof setTimeout> | null
  startedAt: number | null
}

interface Clock {
  now: () => number
  setTimeout: (callback: () => void, ms: number) => ReturnType<typeof setTimeout>
  clearTimeout: (timerId: ReturnType<typeof setTimeout>) => void
}

const defaultClock: Clock = {
  now: () => Date.now(),
  setTimeout: (callback, ms) => setTimeout(callback, ms),
  clearTimeout: (timerId) => clearTimeout(timerId)
}

export class OrderController {
  nextOrderId = 1
  nextBotId = 1
  pendingOrders: Order[] = []
  completedOrders: Order[] = []
  bots: Bot[] = []

  private readonly clock: Clock

  constructor(clock: Clock = defaultClock) {
    this.clock = clock
  }

  createOrder(type: OrderType): Order {
    const order: Order = {
      id: this.nextOrderId,
      type,
      status: 'PENDING',
      createdAt: this.clock.now(),
      cookingStartedAt: null,
      completedAt: null,
      cookingBotId: null,
      cancelCount: 0
    }

    this.nextOrderId += 1
    this.insertPendingOrder(order)
    this.scheduleBots()
    return order
  }

  addBot(): Bot {
    const bot: Bot = {
      id: this.nextBotId,
      status: 'IDLE',
      currentOrder: null,
      timerId: null,
      startedAt: null
    }

    this.nextBotId += 1
    this.bots.push(bot)
    this.scheduleBots()
    return bot
  }

  removeLatestBot(): Bot | null {
    const bot = this.bots[this.bots.length - 1]

    if (!bot) {
      return null
    }

    return this.removeBot(bot.id)
  }

  removeBot(botId: number): Bot | null {
    const botIndex = this.bots.findIndex((bot) => bot.id === botId)

    if (botIndex === -1) {
      return null
    }

    const bot = this.bots[botIndex]

    if (bot.timerId) {
      this.clock.clearTimeout(bot.timerId)
    }

    if (bot.currentOrder) {
      this.insertPendingOrder({
        ...bot.currentOrder,
        status: 'PENDING',
        cookingStartedAt: null,
        completedAt: null,
        cookingBotId: null,
        cancelCount: bot.currentOrder.cancelCount + 1
      })
    }

    this.bots.splice(botIndex, 1)
    this.scheduleBots()
    return bot
  }

  clearTimers(): void {
    this.bots.forEach((bot) => {
      if (bot.timerId) {
        this.clock.clearTimeout(bot.timerId)
      }
      bot.timerId = null
    })
  }

  private insertPendingOrder(order: Order): void {
    this.pendingOrders.push({
      ...order,
      status: 'PENDING'
    })
    this.pendingOrders.sort(comparePendingOrders)
  }

  private scheduleBots(): void {
    for (const bot of this.bots) {
      if (bot.status === 'IDLE' && this.pendingOrders.length > 0) {
        const order = this.pendingOrders.shift()
        if (order) {
          this.startProcessing(bot, order)
        }
      }
    }
  }

  private startProcessing(bot: Bot, order: Order): void {
    const startedAt = this.clock.now()
    const processingOrder: Order = {
      ...order,
      status: 'PROCESSING',
      cookingStartedAt: startedAt,
      completedAt: null,
      cookingBotId: bot.id
    }

    bot.status = 'PROCESSING'
    bot.currentOrder = processingOrder
    bot.startedAt = startedAt
    bot.timerId = this.clock.setTimeout(() => {
      this.completeOrder(bot.id, processingOrder.id)
    }, PROCESSING_MS)
  }

  private completeOrder(botId: number, orderId: number): void {
    const bot = this.bots.find((item) => item.id === botId)

    if (!bot || bot.currentOrder?.id !== orderId) {
      return
    }

    this.completedOrders.push({
      ...bot.currentOrder,
      status: 'COMPLETE',
      completedAt: this.clock.now()
    })

    bot.status = 'IDLE'
    bot.currentOrder = null
    bot.timerId = null
    bot.startedAt = null
    this.scheduleBots()
  }
}

export function comparePendingOrders(a: Order, b: Order): number {
  if (a.type !== b.type) {
    return a.type === 'VIP' ? -1 : 1
  }

  return a.id - b.id
}
