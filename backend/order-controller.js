// Priority values are kept as plain strings so they are easy to print in CLI output
// and to assert against in tests without any conversion layer.
export const ORDER_PRIORITY = {
  VIP: 'VIP',
  NORMAL: 'NORMAL',
}

// The controller owns the full in-memory state for orders and bots.
// It deliberately has no persistence layer because the assignment explicitly says
// all processing can stay in memory for the prototype.
export class OrderController {
  constructor({
    processingTimeMs = 10_000,
    schedule = globalThis.setTimeout,
    cancel = globalThis.clearTimeout,
    now = () => new Date(),
    onEvent = () => {},
  } = {}) {
    // The processing duration is configurable so the real CLI can use 10 seconds
    // while unit tests can run instantly with fake timers.
    this.processingTimeMs = processingTimeMs

    // Timer and clock dependencies are injected for testability.
    // That lets tests control time without waiting for real wall-clock delays.
    this.schedule = schedule
    this.cancel = cancel
    this.now = now

    // The CLI subscribes to these events to build result.txt output.
    this.onEvent = onEvent

    // IDs must be unique and increasing across the lifetime of the controller.
    this.nextOrderId = 1
    this.nextBotId = 1

    // pendingOrders is a single ordered queue.
    // Its order is the effective processing order after applying VIP priority rules.
    this.pendingOrders = []

    // completedOrders records the actual completion order for reporting.
    this.completedOrders = []

    // Bots are stored in creation order so removing the newest bot is just pop().
    this.bots = []
  }

  // Normal orders are appended behind all currently pending work except when later
  // VIP orders are inserted ahead of them.
  addNormalOrder() {
    return this.#addOrder(ORDER_PRIORITY.NORMAL)
  }

  // VIP orders always stay ahead of normal orders but still preserve FIFO ordering
  // among other VIP orders.
  addVipOrder() {
    return this.#addOrder(ORDER_PRIORITY.VIP)
  }

  // Adding a bot should immediately try to consume pending work.
  // A newly created bot starts idle and is promoted to busy by #dispatch() if needed.
  addBot() {
    const bot = {
      id: this.nextBotId++,
      status: 'IDLE',
      currentOrder: null,
      timer: null,
    }

    this.bots.push(bot)
    this.#emit('bot_added', { botId: bot.id })
    this.#dispatch()
    return bot.id
  }

  // The newest bot is always removed first.
  // If it is already processing an order, the timer is cancelled and the order is
  // returned to pending in the same relative priority position it should still hold.
  removeBot() {
    const bot = this.bots.at(-1)
    if (!bot) {
      return null
    }

    this.bots.pop()

    if (bot.timer !== null) {
      this.cancel(bot.timer)
      bot.timer = null
    }

    if (bot.currentOrder) {
      const restoredOrder = bot.currentOrder
      bot.currentOrder = null
      bot.status = 'REMOVED'
      this.#insertPendingOrder(restoredOrder, { restore: true })
      this.#emit('order_requeued', {
        botId: bot.id,
        orderId: restoredOrder.id,
        priority: restoredOrder.priority,
      })
    }

    this.#emit('bot_removed', { botId: bot.id })
    this.#dispatch()
    return bot.id
  }

  // A defensive snapshot is returned so callers cannot mutate controller state from
  // the outside and accidentally break queue or bot invariants.
  getState() {
    return {
      nextOrderId: this.nextOrderId,
      nextBotId: this.nextBotId,
      pendingOrders: this.pendingOrders.map((order) => ({ ...order })),
      completedOrders: this.completedOrders.map((order) => ({ ...order })),
      bots: this.bots.map((bot) => ({
        id: bot.id,
        status: bot.status,
        currentOrder: bot.currentOrder ? { ...bot.currentOrder } : null,
      })),
    }
  }

  // All order creation flows pass through one method so ID assignment, timestamps,
  // event emission, and dispatch behavior stay consistent.
  #addOrder(priority) {
    const orderId = this.nextOrderId++
    const order = {
      id: orderId,
      priority,
      // sequence captures original creation order.
      // It is later used when a cancelled in-flight order must return to the correct
      // spot relative to other pending orders of the same priority.
      sequence: orderId,
      createdAt: this.now(),
    }

    this.#insertPendingOrder(order)
    this.#emit('order_added', {
      orderId: order.id,
      priority: order.priority,
    })
    this.#dispatch()
    return order.id
  }

  // New VIP orders go after the last pending VIP order and before every pending
  // normal order. New normal orders simply append to the end.
  //
  // When restore=true, the order is not treated as brand new work. Instead it is a
  // previously started order whose bot was removed. In that case we use sequence to
  // put it back ahead of any later-created pending order with the same priority.
  #insertPendingOrder(order, { restore = false } = {}) {
    if (order.priority === ORDER_PRIORITY.VIP) {
      const vipOrders = this.pendingOrders.filter(
        (pendingOrder) => pendingOrder.priority === ORDER_PRIORITY.VIP,
      )
      const vipInsertIndex = restore
        ? vipOrders.findIndex((pendingOrder) => pendingOrder.sequence > order.sequence)
        : -1

      if (vipInsertIndex !== -1) {
        const absoluteIndex = this.pendingOrders.findIndex(
          (pendingOrder) => pendingOrder.priority === ORDER_PRIORITY.VIP && pendingOrder.sequence > order.sequence,
        )
        this.pendingOrders.splice(absoluteIndex, 0, order)
        return
      }

      const lastVipIndex = this.pendingOrders.findLastIndex(
        (pendingOrder) => pendingOrder.priority === ORDER_PRIORITY.VIP,
      )

      if (lastVipIndex === -1) {
        this.pendingOrders.unshift(order)
        return
      }

      this.pendingOrders.splice(lastVipIndex + 1, 0, order)
      return
    }

    if (restore) {
      const normalInsertIndex = this.pendingOrders.findIndex(
        (pendingOrder) => pendingOrder.priority === ORDER_PRIORITY.NORMAL && pendingOrder.sequence > order.sequence,
      )

      if (normalInsertIndex !== -1) {
        this.pendingOrders.splice(normalInsertIndex, 0, order)
        return
      }
    }

    this.pendingOrders.push(order)
  }

  // Dispatch is the only place that turns pending orders into in-flight work.
  // It repeatedly pairs the next pending order with the next idle bot until either
  // there is no work left or there is no free bot left.
  #dispatch() {
    for (const bot of this.bots) {
      if (bot.status !== 'IDLE') {
        continue
      }

      const nextOrder = this.pendingOrders.shift()
      if (!nextOrder) {
        return
      }

      bot.status = 'BUSY'
      bot.currentOrder = nextOrder
      this.#emit('order_started', {
        botId: bot.id,
        orderId: nextOrder.id,
        priority: nextOrder.priority,
      })

      bot.timer = this.schedule(() => {
        this.#completeOrder(bot.id)
      }, this.processingTimeMs)
    }
  }

  // Completion moves the order into the finished list, frees the bot, and then
  // immediately triggers another dispatch so the bot can pick up the next order.
  #completeOrder(botId) {
    const bot = this.bots.find((candidate) => candidate.id === botId)
    if (!bot || !bot.currentOrder) {
      return
    }

    const completedOrder = bot.currentOrder
    bot.currentOrder = null
    bot.timer = null
    bot.status = 'IDLE'
    this.completedOrders.push({ ...completedOrder, completedAt: this.now() })

    this.#emit('order_completed', {
      botId: bot.id,
      orderId: completedOrder.id,
      priority: completedOrder.priority,
    })

    this.#dispatch()
  }

  // Every meaningful state transition flows through one event channel.
  // That keeps the controller logic decoupled from presentation while still making
  // it easy for the CLI to log a detailed execution trace.
  #emit(type, payload) {
    this.onEvent({
      type,
      timestamp: this.now(),
      state: this.getState(),
      ...payload,
    })
  }
}
