import type { Bot, ControllerState, Order, OrderType } from './types'

/** Time a bot spends cooking one order, per the spec. */
export const DEFAULT_PROCESS_MS = 10_000

/**
 * Order-control logic for the cooking-bot simulation. Framework-agnostic so it
 * can be unit-tested on its own; the UI binds to it via `subscribe`/`getSnapshot`.
 *
 * Invariant: `pending` is always ordered by (priority, arrival) — [VIP…, NORMAL…]
 * with ascending order id (arrival order) within each group. A freed bot takes
 * the front; a requeued order re-inserts at its original slot by arrival order.
 */
export class OrderController {
  private nextOrderId = 1
  private nextBotId = 1

  private pending: Order[] = []
  private complete: Order[] = []
  private bots: Bot[] = []

  /** Cooking timers keyed by bot id, so removal can cancel them. */
  private timers = new Map<number, ReturnType<typeof setTimeout>>()
  private listeners = new Set<() => void>()
  private snapshot: ControllerState
  private readonly processMs: number

  constructor(processMs: number = DEFAULT_PROCESS_MS) {
    this.processMs = processMs
    this.snapshot = this.buildSnapshot()
  }

  get processDurationMs(): number {
    return this.processMs
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  // A new snapshot reference is built only on change (see emit), so returning
  // the cached one keeps useSyncExternalStore from looping.
  getSnapshot = (): ControllerState => this.snapshot

  addOrder(type: OrderType): Order {
    const order: Order = {
      id: this.nextOrderId++,
      type,
      status: 'PENDING',
      createdAt: Date.now(),
    }
    this.insertByPriority(order)
    this.dispatch()
    this.emit()
    return order
  }

  addBot(): Bot {
    const bot: Bot = { id: this.nextBotId++, status: 'IDLE', currentOrder: null }
    this.bots.push(bot)
    this.dispatch()
    this.emit()
    return bot
  }

  /** Destroy the newest bot; any order it was cooking returns to PENDING. */
  removeBot(): Bot | null {
    const bot = this.bots.pop()
    if (!bot) return null

    const timer = this.timers.get(bot.id)
    if (timer !== undefined) {
      clearTimeout(timer)
      this.timers.delete(bot.id)
    }

    if (bot.currentOrder) {
      const order = bot.currentOrder
      order.status = 'PENDING'
      order.startedAt = undefined
      bot.currentOrder = null
      this.insertByPriority(order)
    }

    this.dispatch()
    this.emit()
    return bot
  }

  /**
   * Insert ordered by (priority, arrival): VIP outranks NORMAL, and within a
   * type ascending id = arrival order. A new order (highest id) lands at the
   * back of its group; a requeued order (its original, lower id) drops back
   * into its original slot — ahead of same-type orders that arrived later.
   */
  private insertByPriority(order: Order): void {
    const rank = (o: Order) => (o.type === 'VIP' ? 0 : 1)
    const index = this.pending.findIndex(
      (o) => rank(order) < rank(o) || (rank(order) === rank(o) && order.id < o.id),
    )
    if (index === -1) this.pending.push(order)
    else this.pending.splice(index, 0, order)
  }

  /** Assign pending orders to idle bots, front of queue first. */
  private dispatch(): void {
    for (const bot of this.bots) {
      if (bot.status !== 'IDLE' || this.pending.length === 0) continue
      const order = this.pending.shift()!
      order.status = 'PROCESSING'
      order.startedAt = Date.now()
      bot.status = 'PROCESSING'
      bot.currentOrder = order
      this.timers.set(
        bot.id,
        setTimeout(() => this.onProcessingComplete(bot.id), this.processMs),
      )
    }
  }

  private onProcessingComplete(botId: number): void {
    const bot = this.bots.find((b) => b.id === botId)
    this.timers.delete(botId)
    // Bot may have been removed before its timer fired.
    if (!bot || !bot.currentOrder) return

    const order = bot.currentOrder
    order.status = 'COMPLETE'
    order.completedAt = Date.now()
    this.complete.push(order)

    bot.currentOrder = null
    bot.status = 'IDLE'

    this.dispatch()
    this.emit()
  }

  private buildSnapshot(): ControllerState {
    return {
      pending: this.pending.map((o) => ({ ...o })),
      complete: this.complete.map((o) => ({ ...o })),
      bots: this.bots.map((b) => ({
        ...b,
        currentOrder: b.currentOrder ? { ...b.currentOrder } : null,
      })),
    }
  }

  private emit(): void {
    this.snapshot = this.buildSnapshot()
    for (const listener of this.listeners) listener()
  }
}
