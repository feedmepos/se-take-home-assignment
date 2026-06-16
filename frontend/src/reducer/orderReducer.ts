import { AppState, Action, Order, Bot } from './types'

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

export function reinsertOrder(orders: Order[], order: Order): Order[] {
  const reset: Order = { ...order, status: 'PENDING', startedAt: null }
  return order.type === 'VIP' ? insertVipOrder(orders, reset) : [...orders, reset]
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
      const inserted = insertVipOrder(state.orders, newOrder)
      const { orders, bots } = assignToIdleBot(inserted, state.bots)
      return { ...state, orders, bots, nextOrderId: state.nextOrderId + 1 }
    }

    case 'ADD_BOT':
    case 'REMOVE_BOT':
    case 'ORDER_COMPLETE':
      return state

    default:
      return state
  }
}
