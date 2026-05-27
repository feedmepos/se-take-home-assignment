import { useReducer, useEffect, useRef, useMemo, useCallback } from 'react'

const PROCESSING_TIME = 10000

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_NORMAL_ORDER': {
      const order = {
        id: state.nextOrderId,
        type: 'NORMAL',
        status: 'PENDING',
      }
      return {
        ...state,
        orders: [...state.orders, order],
        nextOrderId: state.nextOrderId + 1,
      }
    }
    case 'ADD_VIP_ORDER': {
      const order = {
        id: state.nextOrderId,
        type: 'VIP',
        status: 'PENDING',
      }
      return {
        ...state,
        orders: [...state.orders, order],
        nextOrderId: state.nextOrderId + 1,
      }
    }
    case 'ADD_BOT': {
      const bot = {
        id: state.nextBotId,
        status: 'IDLE',
        currentOrderId: null,
      }
      return {
        ...state,
        bots: [...state.bots, bot],
        nextBotId: state.nextBotId + 1,
      }
    }
    case 'START_PROCESSING': {
      return {
        ...state,
        bots: state.bots.map((b) =>
          b.id === action.botId
            ? { ...b, status: 'PROCESSING', currentOrderId: action.orderId }
            : b
        ),
        orders: state.orders.map((o) =>
          o.id === action.orderId ? { ...o, status: 'PROCESSING' } : o
        ),
      }
    }
    case 'COMPLETE_ORDER': {
      return {
        ...state,
        bots: state.bots.map((b) =>
          b.id === action.botId
            ? { ...b, status: 'IDLE', currentOrderId: null }
            : b
        ),
        orders: state.orders.map((o) =>
          o.id === action.orderId ? { ...o, status: 'COMPLETE' } : o
        ),
      }
    }
    case 'REMOVE_BOT': {
      const bot = state.bots.find((b) => b.id === action.botId)
      if (!bot) return state
      return {
        ...state,
        bots: state.bots.filter((b) => b.id !== action.botId),
        orders: state.orders.map((o) =>
          o.id === bot.currentOrderId ? { ...o, status: 'PENDING' } : o
        ),
      }
    }
    default:
      return state
  }
}

const initialState = {
  orders: [],
  bots: [],
  nextOrderId: 1,
  nextBotId: 1,
}

export default function useOrderController() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const timersRef = useRef(new Map())
  const stateRef = useRef(state)

  // Derived: sorted pending orders (VIP first, then FIFO by id)
  const pendingOrders = useMemo(() => {
    return state.orders
      .filter((o) => o.status === 'PENDING')
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'VIP' ? -1 : 1
        return a.id - b.id
      })
  }, [state.orders])

  // Derived: completed orders (most recent first)
  const completeOrders = useMemo(() => {
    return state.orders
      .filter((o) => o.status === 'COMPLETE')
      .sort((a, b) => b.id - a.id)
  }, [state.orders])

  useEffect(() => {
    stateRef.current = state
  }, [state])

  // Assign pending orders to idle bots
  useEffect(() => {
    const idleBots = state.bots.filter((b) => b.status === 'IDLE')
    const claimedInPass = new Set()

    for (const bot of idleBots) {
      // Strict Mode guard: don't double-assign
      if (timersRef.current.has(bot.id)) continue

      // Find first pending order not already claimed (in state or this pass)
      const order = pendingOrders.find(
        (o) =>
          !claimedInPass.has(o.id) &&
          !state.bots.some((b2) => b2.currentOrderId === o.id)
      )
      if (!order) break

      claimedInPass.add(order.id)
      dispatch({ type: 'START_PROCESSING', botId: bot.id, orderId: order.id })

      const timerId = setTimeout(() => {
        dispatch({ type: 'COMPLETE_ORDER', botId: bot.id, orderId: order.id })
        timersRef.current.delete(bot.id)
      }, PROCESSING_TIME)

      timersRef.current.set(bot.id, timerId)
    }
  }, [state.bots, state.orders, pendingOrders])

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timerId) => clearTimeout(timerId))
      timersRef.current.clear()
    }
  }, [])

  const addNormalOrder = useCallback(() => {
    dispatch({ type: 'ADD_NORMAL_ORDER' })
  }, [])

  const addVipOrder = useCallback(() => {
    dispatch({ type: 'ADD_VIP_ORDER' })
  }, [])

  const addBot = useCallback(() => {
    dispatch({ type: 'ADD_BOT' })
  }, [])

  const removeBot = useCallback(() => {
    const bots = stateRef.current.bots
    if (bots.length === 0) return
    const lastBot = bots[bots.length - 1]
    const timerId = timersRef.current.get(lastBot.id)
    if (timerId) {
      clearTimeout(timerId)
      timersRef.current.delete(lastBot.id)
    }
    dispatch({ type: 'REMOVE_BOT', botId: lastBot.id })
  }, [])

  return {
    state,
    pendingOrders,
    completeOrders,
    addNormalOrder,
    addVipOrder,
    addBot,
    removeBot,
  }
}
