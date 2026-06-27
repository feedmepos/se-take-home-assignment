/**
 * @layer Domain
 * @role Order scheduler: enqueue, VIP segmented queue, dispatch to idle bots, next order on completion, requeue on bot removal
 * @depends bot.ts, types.ts, constants.ts
 * @exports OrderController class and query/action methods (getSnapshot, addNormalOrder, etc.)
 * @must-not Depend on Vue/DOM; must not own bot 10s timer (Bot.startWork owns that)
 */
import { Bot } from './bot'
import { INITIAL_ORDER_ID, ORDER_STATUS, PROCESSING_SECONDS, ROLE_PRIORITY } from './constants'
import type { BotStats, CustomerRole, KitchenSnapshot, Order, ProcessingOrderView } from './types'

function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

export class OrderController {
  private segments = new Map<number, Order[]>()
  private bots: Bot[] = []
  private completed: Order[] = []
  private allOrders: Order[] = []
  private nextOrderId = INITIAL_ORDER_ID
  private nextBotId = 1
  private nextSequence = 1
  private onStateChange?: () => void

  constructor(onStateChange?: () => void) {
    this.onStateChange = onStateChange
  }

  addNormalOrder(): void {
    this.addOrder('normal')
  }

  addVipOrder(): void {
    this.addOrder('vip')
  }

  addBot(): void {
    this.bots.push(new Bot(this.nextBotId++))
    this.dispatchToIdleBots()
    this.notify()
  }

  removeBot(): void {
    if (this.bots.length === 0) {
      return
    }

    const bot = this.bots[this.bots.length - 1]

    if (bot.isProcessing() && bot.currentOrderId != null) {
      const order = this.findOrder(bot.currentOrderId)
      bot.cancelWork()
      if (order && order.status === ORDER_STATUS.PROCESSING) {
        order.status = ORDER_STATUS.PENDING
        this.reinsert(order)
      }
    }

    this.bots = this.bots.filter((b) => b.id !== bot.id)
    this.notify()
  }

  destroy(): void {
    for (const bot of this.bots) {
      bot.cancelWork()
    }
  }

  getSnapshot(): KitchenSnapshot {
    return {
      orders: [...this.allOrders],
      bots: this.bots.map((b) => b.toSnapshot()),
      completed: [...this.completed],
    }
  }

  getPendingOrders(): Order[] {
    const result: Order[] = []
    const priorities = [...this.segments.keys()].sort((a, b) => a - b)

    for (const priority of priorities) {
      const segment = this.segments.get(priority) ?? []
      result.push(...segment.map((o) => ({ ...o })))
    }

    return result
  }

  getProcessingOrders(): ProcessingOrderView[] {
    const result: ProcessingOrderView[] = []

    for (const bot of this.bots) {
      if (!bot.isProcessing() || bot.currentOrderId == null) {
        continue
      }

      const order = this.findOrder(bot.currentOrderId)
      if (!order || order.status !== ORDER_STATUS.PROCESSING) {
        continue
      }

      result.push({
        id: order.id,
        role: order.role,
        botId: bot.id,
        startedAt: bot.getStartedAt() ?? 0,
      })
    }

    return result.sort((a, b) => a.startedAt - b.startedAt)
  }

  getCompletedOrders(): Order[] {
    return [...this.completed]
      .map((o) => ({ ...o }))
      .sort((a, b) => (a.completedAtMs ?? 0) - (b.completedAtMs ?? 0))
  }

  getBotStats(): BotStats {
    const idle = this.bots.filter((b) => b.isIdle()).length
    const processing = this.bots.filter((b) => b.isProcessing()).length
    return {
      total: this.bots.length,
      idle,
      processing,
    }
  }

  getProcessingSeconds(): number {
    return PROCESSING_SECONDS
  }

  private addOrder(role: CustomerRole): void {
    const order: Order = {
      id: this.nextOrderId++,
      role,
      status: ORDER_STATUS.PENDING,
      sequence: this.nextSequence++,
    }
    this.allOrders.push(order)
    this.enqueue(order)
    this.dispatchToIdleBots()
    this.notify()
  }

  private enqueue(order: Order): void {
    const priority = ROLE_PRIORITY[order.role]
    const segment = this.segments.get(priority) ?? []
    segment.push(order)
    this.segments.set(priority, segment)
  }

  private dequeueNext(): Order | null {
    const priorities = [...this.segments.keys()].sort((a, b) => a - b)

    for (const priority of priorities) {
      const segment = this.segments.get(priority)
      if (segment && segment.length > 0) {
        return segment.shift()!
      }
    }

    return null
  }

  private reinsert(order: Order): void {
    const priority = ROLE_PRIORITY[order.role]
    const segment = this.segments.get(priority) ?? []
    const insertAt = segment.findIndex((o) => o.sequence > order.sequence)

    if (insertAt === -1) {
      segment.push(order)
    } else {
      segment.splice(insertAt, 0, order)
    }

    this.segments.set(priority, segment)
  }

  /** Assign pending orders to every idle bot. */
  private dispatchToIdleBots(): void {
    for (const bot of this.bots) {
      if (bot.isIdle()) {
        this.dispatchToBot(bot)
      }
    }
  }

  /** Bot picks the next order and starts its own timer. */
  private dispatchToBot(bot: Bot): void {
    const order = this.dequeueNext()
    if (!order) {
      return
    }

    order.status = ORDER_STATUS.PROCESSING
    bot.startWork(order.id, () => this.handleBotFinished(bot))
  }

  /** Called when a bot's timer completes; bot then continues with the next order. */
  private handleBotFinished(bot: Bot): void {
    const orderId = bot.currentOrderId
    if (orderId == null) {
      return
    }

    const order = this.findOrder(orderId)
    if (!order || order.status !== ORDER_STATUS.PROCESSING) {
      bot.release()
      return
    }

    order.status = ORDER_STATUS.COMPLETE
    const now = new Date()
    order.completedAt = formatTime(now)
    order.completedAtMs = now.getTime()
    this.completed.push(order)
    bot.release()

    this.dispatchToBot(bot)
    this.notify()
  }

  private findOrder(orderId: number): Order | undefined {
    return this.allOrders.find((o) => o.id === orderId)
  }

  private notify(): void {
    this.onStateChange?.()
  }
}
