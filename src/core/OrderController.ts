import type {
  Bot,
  ControllerState,
  Order,
  OrderType,
} from './types'

/** Time a bot spends cooking a single order, per the spec. */
export const DEFAULT_PROCESS_MS = 10_000

/**
 * Core order-control logic for the cooking-bot simulation.
 *
 * Framework-agnostic on purpose: all rules (priority queueing, bot lifecycle,
 * 10s processing) live here so they can be unit-tested and explained without
 * any React noise. The UI subscribes via {@link subscribe} and reads immutable
 * snapshots via {@link getSnapshot}.
 *
 * Invariant: `pending` is always ordered [VIP…VIP, NORMAL…NORMAL] with FIFO
 * within each group. Keeping the queue sorted means a freed bot simply takes
 * the front, and a requeued order (from removing a busy bot) just re-inserts by
 * priority — which naturally restores its original position.
 */
export class OrderController {
  private nextOrderId = 1
  private nextBotId = 1

  private pending: Order[] = []
  private complete: Order[] = []
  private bots: Bot[] = []

  /** Active cooking timers, keyed by bot id, so removal can cancel them. */
  private timers = new Map<number, ReturnType<typeof setTimeout>>()

  private listeners = new Set<() => void>()

  /** Cached immutable snapshot (rebuilt only on change, for useSyncExternalStore). */
  private snapshot: ControllerState

  /** Time a bot spends cooking one order (ms). Injectable for fast tests. */
  private readonly processMs: number

  constructor(processMs: number = DEFAULT_PROCESS_MS) {
    this.processMs = processMs
    this.snapshot = this.buildSnapshot()
  }

  /** How long a single order takes to cook (ms). Exposed for UI countdowns. */
  get processDurationMs(): number {
    return this.processMs
  }

  // ---------------------------------------------------------------------------
  // Subscription (external store)
  // ---------------------------------------------------------------------------

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = (): ControllerState => this.snapshot

  // ---------------------------------------------------------------------------
  // Commands
  // ---------------------------------------------------------------------------

  /** Submit a new order and immediately dispatch it to any idle bot. */
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

  /** Add a bot; it starts cooking a pending order at once if one exists. */
  addBot(): Bot {
    const bot: Bot = {
      id: this.nextBotId++,
      status: 'IDLE',
      currentOrder: null,
    }
    this.bots.push(bot)
    this.dispatch()
    this.emit()
    return bot
  }

  /**
   * Destroy the newest bot. If it was mid-cook, its order is returned to the
   * pending queue at its priority position (never lost), then any other idle
   * bot may pick it up.
   */
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

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  /** Insert keeping the [VIP…, NORMAL…] + FIFO invariant. */
  private insertByPriority(order: Order): void {
    if (order.type === 'VIP') {
      const firstNormal = this.pending.findIndex((o) => o.type === 'NORMAL')
      if (firstNormal === -1) {
        this.pending.push(order)
      } else {
        this.pending.splice(firstNormal, 0, order)
      }
    } else {
      this.pending.push(order)
    }
  }

  /** Assign pending orders to any idle bots, front of queue first. */
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

  /** Timer callback: finish the order and let the bot pick up the next one. */
  private onProcessingComplete(botId: number): void {
    const bot = this.bots.find((b) => b.id === botId)
    this.timers.delete(botId)
    // Bot may have been removed before the timer fired — nothing to do.
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

  // ---------------------------------------------------------------------------
  // Snapshotting
  // ---------------------------------------------------------------------------

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
