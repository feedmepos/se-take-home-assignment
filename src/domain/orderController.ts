// Every bot needs 10 seconds to finish one order, matching the assignment rule.
export const PROCESSING_TIME_MS = 10_000

export type OrderPriority = 'VIP' | 'NORMAL'
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE'
export type BotStatus = 'IDLE' | 'PROCESSING'

export type Order = {
  id: number
  priority: OrderPriority
  status: OrderStatus
}

export type Bot = {
  id: number
  status: BotStatus
  activeOrderId: number | null
}

// The reducer keeps three explicit order buckets so the UI can render each area
// directly without having to derive lists from a single mixed collection.
export type OrderControllerState = {
  nextOrderId: number
  nextBotId: number
  pendingOrders: Order[]
  processingOrders: Order[]
  completedOrders: Order[]
  bots: Bot[]
}

export type OrderControllerAction =
  | { type: 'create_order'; priority: OrderPriority }
  | { type: 'add_bot' }
  | { type: 'remove_bot' }
  | { type: 'complete_order'; botId: number; orderId: number }
  | { type: 'sync_assignments' }

export const initialState: OrderControllerState = {
  nextOrderId: 1,
  nextBotId: 1,
  pendingOrders: [],
  processingOrders: [],
  completedOrders: [],
  bots: [],
}

// This reducer is the single source of truth for all order and bot transitions.
// Each branch changes state first, then lets assignPendingOrders() pull any waiting
// work into newly available bots so queue assignment logic stays centralized.
export function orderControllerReducer(
  state: OrderControllerState,
  action: OrderControllerAction,
): OrderControllerState {
  switch (action.type) {
    case 'create_order': {
      const order: Order = {
        id: state.nextOrderId,
        priority: action.priority,
        status: 'PENDING',
      }

      return assignPendingOrders({
        ...state,
        nextOrderId: state.nextOrderId + 1,
        pendingOrders: insertPendingOrder(state.pendingOrders, order),
      })
    }

    case 'add_bot': {
      const bot: Bot = {
        id: state.nextBotId,
        status: 'IDLE',
        activeOrderId: null,
      }

      return assignPendingOrders({
        ...state,
        nextBotId: state.nextBotId + 1,
        bots: [...state.bots, bot],
      })
    }

    case 'remove_bot': {
      if (state.bots.length === 0) {
        return state
      }

      // The newest bot is always the one that gets removed.
      // This mirrors the requirement that "- Bot" destroys the newest bot first.
      const botToRemove = state.bots[state.bots.length - 1]
      const remainingBots = state.bots.slice(0, -1)

      if (botToRemove.activeOrderId === null) {
        return {
          ...state,
          bots: remainingBots,
        }
      }

      const orderToReturn = state.processingOrders.find(
        (order) => order.id === botToRemove.activeOrderId,
      )

      return assignPendingOrders({
        ...state,
        bots: remainingBots,
        processingOrders: state.processingOrders.filter(
          (order) => order.id !== botToRemove.activeOrderId,
        ),
        // A removed in-flight order becomes pending again and is reinserted with the
        // same VIP-before-normal rule as every other pending order.
        pendingOrders: orderToReturn
          ? insertPendingOrder(state.pendingOrders, {
              ...orderToReturn,
              status: 'PENDING',
            })
          : state.pendingOrders,
      })
    }

    case 'complete_order': {
      const completedOrder = state.processingOrders.find(
        (order) => order.id === action.orderId,
      )

      if (!completedOrder) {
        return state
      }

      return assignPendingOrders({
        ...state,
        processingOrders: state.processingOrders.filter(
          (order) => order.id !== action.orderId,
        ),
        completedOrders: [
          ...state.completedOrders,
          { ...completedOrder, status: 'COMPLETE' },
        ],
        bots: state.bots.map<Bot>((bot) =>
          bot.id === action.botId
            ? { ...bot, status: 'IDLE', activeOrderId: null }
            : bot,
        ),
      })
    }

    case 'sync_assignments':
      return assignPendingOrders(state)

    default:
      return state
  }
}

// Assignment only happens here.
// Any idle bot immediately picks the next pending order until either no bots or no
// pending orders remain. This keeps processing behavior consistent across actions.
function assignPendingOrders(
  state: OrderControllerState,
): OrderControllerState {
  const pendingOrders = [...state.pendingOrders]
  const processingOrders = [...state.processingOrders]

  const bots = state.bots.map<Bot>((bot) => {
    if (bot.activeOrderId !== null || pendingOrders.length === 0) {
      return bot
    }

    const nextOrder = pendingOrders.shift()!
    processingOrders.push({ ...nextOrder, status: 'PROCESSING' })

    return {
      ...bot,
      status: 'PROCESSING',
      activeOrderId: nextOrder.id,
    }
  })

  return {
    ...state,
    pendingOrders,
    processingOrders,
    bots,
  }
}

// VIP orders must be placed after existing VIP orders but before all normal orders.
// Normal orders simply stay at the back of the pending queue.
export function insertPendingOrder(pendingOrders: Order[], order: Order): Order[] {
  if (order.priority === 'VIP') {
    const vipCount = pendingOrders.filter((pendingOrder) => pendingOrder.priority === 'VIP').length

    return [
      ...pendingOrders.slice(0, vipCount),
      order,
      ...pendingOrders.slice(vipCount),
    ]
  }

  return [...pendingOrders, order]
}
