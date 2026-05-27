import type { Bot, Order, OrderControllerState, OrderType } from './types'

/**
 * Fixed cooking duration for every order handled by a bot.
 *
 * @example
 * const finishAt = bot.startedAt + ORDER_PROCESSING_MS
 */
export const ORDER_PROCESSING_MS = 10_000

/**
 * Creates the empty in-memory controller state used when the app first loads.
 *
 * @returns State with no orders, no bots, and both id sequences starting at 1.
 */
export const createInitialState = (): OrderControllerState => ({
  orders: [],
  bots: [],
  nextOrderId: 1,
  nextBotId: 1,
})

/**
 * Sorts pending orders by the product rule: VIP first, then FIFO within type.
 *
 * @example
 * [normalOrder, vipOrder].toSorted(comparePendingOrders) // [vipOrder, normalOrder]
 */
export const comparePendingOrders = (left: Order, right: Order) => {
  if (left.type !== right.type) {
    return left.type === 'VIP' ? -1 : 1
  }

  if (left.createdAt !== right.createdAt) {
    return left.createdAt - right.createdAt
  }

  return left.id - right.id
}

/**
 * Returns the display-ready pending queue in dispatch priority order.
 *
 * @example
 * selectPendingOrders(state.orders).map((order) => order.id)
 */
export const selectPendingOrders = (orders: Order[]) =>
  orders.filter((order) => order.status === 'PENDING').toSorted(comparePendingOrders)

/**
 * Returns completed orders in completion order, with id as a stable tie-breaker.
 */
export const selectCompleteOrders = (orders: Order[]) =>
  orders
    .filter((order) => order.status === 'COMPLETE')
    .toSorted((left, right) => {
      const completedDelta = (left.completedAt ?? 0) - (right.completedAt ?? 0)
      return completedDelta || left.id - right.id
    })

/**
 * Returns currently processing orders ordered by id for stable dashboard counts.
 */
export const selectProcessingOrders = (orders: Order[]) =>
  orders.filter((order) => order.status === 'PROCESSING').toSorted((left, right) => left.id - right.id)

/**
 * Adds a normal or VIP order, increments the shared order id sequence, and
 * immediately lets any idle bot pick it up.
 *
 * @example
 * const nextState = addOrder(state, 'VIP', Date.now())
 */
export const addOrder = (
  state: OrderControllerState,
  orderType: OrderType,
  now: number,
): OrderControllerState => {
  const order: Order = {
    id: state.nextOrderId,
    type: orderType,
    status: 'PENDING',
    createdAt: now,
  }

  return dispatchPendingOrders(
    {
      ...state,
      orders: [...state.orders, order],
      nextOrderId: state.nextOrderId + 1,
    },
    now,
  )
}

/**
 * Adds a new idle bot with an increasing id and immediately dispatches work
 * if any pending order exists.
 *
 * @example
 * const stateWithBot = addBot(state, Date.now())
 */
export const addBot = (state: OrderControllerState, now: number): OrderControllerState => {
  const bot: Bot = {
    id: state.nextBotId,
    status: 'IDLE',
  }

  return dispatchPendingOrders(
    {
      ...state,
      bots: [...state.bots, bot],
      nextBotId: state.nextBotId + 1,
    },
    now,
  )
}

/**
 * Removes the newest bot. If that bot was processing an order, the order is
 * returned to PENDING and later re-sorted by VIP/FIFO priority.
 *
 * @example
 * const stateAfterRemoval = removeNewestBot(state)
 */
export const removeNewestBot = (state: OrderControllerState): OrderControllerState => {
  const newestBot = state.bots.toSorted((left, right) => right.id - left.id)[0]

  if (!newestBot) {
    return state
  }

  const orders = state.orders.map((order) => {
    if (newestBot.currentOrderId !== order.id) {
      return order
    }

    // Interrupted work loses elapsed progress per PRD, so startedAt is cleared.
    return {
      ...order,
      status: 'PENDING' as const,
      startedAt: undefined,
      completedAt: undefined,
    }
  })

  return {
    ...state,
    orders,
    bots: state.bots.filter((bot) => bot.id !== newestBot.id),
  }
}

/**
 * Advances the scheduler clock. Completed bot assignments are moved to
 * COMPLETE, freed bots become IDLE, and freed bots immediately take next work.
 *
 * @example
 * const afterTenSeconds = tick(state, startedAt + ORDER_PROCESSING_MS)
 */
export const tick = (state: OrderControllerState, now: number): OrderControllerState => {
  // Multiple bots can finish on the same tick, so collect every completed
  // order id first and apply the state transition in one immutable pass.
  const completedOrderIds = new Set(
    state.bots
      .filter((bot) => bot.status === 'PROCESSING')
      .filter((bot) => (bot.startedAt ?? now) + ORDER_PROCESSING_MS <= now)
      .map((bot) => bot.currentOrderId)
      .filter((orderId): orderId is number => typeof orderId === 'number'),
  )

  if (completedOrderIds.size === 0) {
    return state
  }

  const completedState: OrderControllerState = {
    ...state,
    orders: state.orders.map((order) => {
      if (!completedOrderIds.has(order.id)) {
        return order
      }

      return {
        ...order,
        status: 'COMPLETE',
        completedAt: now,
      }
    }),
    bots: state.bots.map((bot) => {
      if (!bot.currentOrderId || !completedOrderIds.has(bot.currentOrderId)) {
        return bot
      }

      return {
        id: bot.id,
        status: 'IDLE',
      }
    }),
  }

  // A bot that just completed an order should not wait for the next interval
  // when there is already pending work.
  return dispatchPendingOrders(completedState, now)
}

const dispatchPendingOrders = (
  state: OrderControllerState,
  now: number,
): OrderControllerState => {
  const pendingOrders = selectPendingOrders(state.orders)
  const idleBots = state.bots
    .filter((bot) => bot.status === 'IDLE')
    .toSorted((left, right) => left.id - right.id)

  if (pendingOrders.length === 0 || idleBots.length === 0) {
    return state
  }

  const assignments = new Map<number, number>()
  const assignmentCount = Math.min(pendingOrders.length, idleBots.length)

  // Pair the oldest idle bots with the highest-priority pending orders. Keeping
  // this deterministic makes both the UI and tests easy to reason about.
  for (let index = 0; index < assignmentCount; index += 1) {
    assignments.set(idleBots[index].id, pendingOrders[index].id)
  }

  const assignedOrderIds = new Set(assignments.values())

  return {
    ...state,
    orders: state.orders.map((order) => {
      if (!assignedOrderIds.has(order.id)) {
        return order
      }

      return {
        ...order,
        status: 'PROCESSING',
        startedAt: now,
        completedAt: undefined,
      }
    }),
    bots: state.bots.map((bot) => {
      const assignedOrderId = assignments.get(bot.id)

      if (!assignedOrderId) {
        return bot
      }

      return {
        ...bot,
        status: 'PROCESSING',
        currentOrderId: assignedOrderId,
        startedAt: now,
      }
    }),
  }
}
