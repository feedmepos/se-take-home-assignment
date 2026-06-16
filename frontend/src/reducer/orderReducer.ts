import type { AppState, Action, Order, Bot } from './types'

export const initialState: AppState = {
  orders: [],
  bots: [],
  nextOrderId: 1,
  nextBotId: 1,
}

function insertVipOrder(orders: Order[], newOrder: Order): Order[] {
  let lastVipIndex = -1
  for (let i = 0; i < orders.length; i++) {
    if (orders[i].type === 'VIP' && orders[i].status === 'PENDING') lastVipIndex = i
  }
  if (lastVipIndex >= 0) {
    return [...orders.slice(0, lastVipIndex + 1), newOrder, ...orders.slice(lastVipIndex + 1)]
  }
  const firstNormalIndex = orders.findIndex(o => o.type === 'NORMAL' && o.status === 'PENDING')
  if (firstNormalIndex >= 0) {
    return [...orders.slice(0, firstNormalIndex), newOrder, ...orders.slice(firstNormalIndex)]
  }
  return [...orders, newOrder]
}

function reinsertOrder(orders: Order[], order: Order): Order[] {
  const reset: Order = { ...order, status: 'PENDING', startedAt: null }
  return order.type === 'VIP' ? insertVipOrder(orders, reset) : [...orders, reset]
}

function assignToIdleBot(orders: Order[], bots: Bot[]): { orders: Order[]; bots: Bot[] } {
  const idleBot = bots.find(b => b.status === 'IDLE')
  const pendingOrder = orders.find(o => o.status === 'PENDING')
  if (!idleBot || !pendingOrder) return { orders, bots }
  return {
    orders: orders.map(o =>
      o.id === pendingOrder.id ? { ...o, status: 'PROCESSING' as const, startedAt: Date.now() } : o
    ),
    bots: bots.map(b =>
      b.id === idleBot.id ? { ...b, status: 'PROCESSING' as const, processingOrderId: pendingOrder.id } : b
    ),
  }
}

// If a VIP order is PENDING and no idle bot is available, preempt the bot processing
// the lowest-priority Normal order (last in the queue — "most bottom") and assign it
// to the VIP order instead. Called after any action that may leave a VIP waiting.
function applyVipPreemption(orders: Order[], bots: Bot[]): { orders: Order[]; bots: Bot[] } {
  const pendingVip = orders.find(o => o.type === 'VIP' && o.status === 'PENDING')
  if (!pendingVip) return { orders, bots }

  // Idle bot available — assign it directly, no preemption needed
  if (bots.some(b => b.status === 'IDLE')) {
    return assignToIdleBot(orders, bots)
  }

  // Find the last Normal order being processed ("most bottom" in the queue)
  let botToPreempt: Bot | undefined
  for (let i = orders.length - 1; i >= 0; i--) {
    if (orders[i].type === 'NORMAL' && orders[i].status === 'PROCESSING') {
      botToPreempt = bots.find(b => b.processingOrderId === orders[i].id)
      break
    }
  }

  if (!botToPreempt || botToPreempt.processingOrderId === null) return { orders, bots }

  const preemptedOrder = orders.find(o => o.id === botToPreempt!.processingOrderId)!
  const ordersMinusPreempted = orders.filter(o => o.id !== preemptedOrder.id)
  const ordersRestored = reinsertOrder(ordersMinusPreempted, preemptedOrder)
  const botsFreed = bots.map(b =>
    b.id === botToPreempt!.id ? { ...b, status: 'IDLE' as const, processingOrderId: null } : b
  )
  return assignToIdleBot(ordersRestored, botsFreed)
}

export function orderReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_NORMAL_ORDER': {
      const newOrder: Order = { id: state.nextOrderId, type: 'NORMAL', status: 'PENDING', startedAt: null }
      const { orders, bots } = assignToIdleBot([...state.orders, newOrder], state.bots)
      return { ...state, orders, bots, nextOrderId: state.nextOrderId + 1 }
    }

    case 'ADD_VIP_ORDER': {
      const newOrder: Order = { id: state.nextOrderId, type: 'VIP', status: 'PENDING', startedAt: null }
      const ordersWithVip = insertVipOrder(state.orders, newOrder)
      const { orders, bots } = applyVipPreemption(ordersWithVip, state.bots)
      return { ...state, orders, bots, nextOrderId: state.nextOrderId + 1 }
    }

    case 'ADD_BOT': {
      const newBot: Bot = { id: state.nextBotId, status: 'IDLE', processingOrderId: null }
      const { orders, bots } = assignToIdleBot(state.orders, [...state.bots, newBot])
      return { ...state, orders, bots, nextBotId: state.nextBotId + 1 }
    }

    case 'REMOVE_BOT': {
      if (state.bots.length === 0) return state
      const botToRemove = state.bots.reduce((prev, curr) => curr.id > prev.id ? curr : prev)
      let orders = state.orders
      if (botToRemove.processingOrderId !== null) {
        const processingOrder = state.orders.find(o => o.id === botToRemove.processingOrderId)
        if (processingOrder) {
          orders = reinsertOrder(
            state.orders.filter(o => o.id !== processingOrder.id),
            processingOrder
          )
        }
      }
      const remainingBots = state.bots.filter(b => b.id !== botToRemove.id)
      // If a VIP order landed in PENDING (returned from the removed bot), trigger preemption
      const { orders: finalOrders, bots: finalBots } = applyVipPreemption(orders, remainingBots)
      return { ...state, orders: finalOrders, bots: finalBots }
    }

    case 'ORDER_COMPLETE': {
      const bot = state.bots.find(b => b.id === action.botId)
      if (!bot || bot.processingOrderId === null) return state

      const completedId = bot.processingOrderId
      const updatedOrders = state.orders.map(o =>
        o.id === completedId ? { ...o, status: 'COMPLETE' as const, startedAt: null } : o
      )
      const nextPending = updatedOrders.find(o => o.status === 'PENDING')

      if (nextPending) {
        return {
          ...state,
          orders: updatedOrders.map(o =>
            o.id === nextPending.id ? { ...o, status: 'PROCESSING' as const, startedAt: Date.now() } : o
          ),
          bots: state.bots.map(b =>
            b.id === action.botId ? { ...b, processingOrderId: nextPending.id } : b
          ),
        }
      }

      return {
        ...state,
        orders: updatedOrders,
        bots: state.bots.map(b =>
          b.id === action.botId ? { ...b, status: 'IDLE' as const, processingOrderId: null } : b
        ),
      }
    }

    default:
      return state
  }
}
