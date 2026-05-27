import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import {
  addBot,
  addOrder,
  createInitialState,
  removeNewestBot,
  selectCompleteOrders,
  selectPendingOrders,
  selectProcessingOrders,
  tick,
} from '../domain/scheduler'
import type { OrderControllerState, OrderType } from '../domain/types'

type ControllerAction =
  | { type: 'ADD_ORDER'; orderType: OrderType; now: number }
  | { type: 'ADD_BOT'; now: number }
  | { type: 'REMOVE_BOT' }
  | { type: 'TICK'; now: number }

const reducer = (state: OrderControllerState, action: ControllerAction) => {
  switch (action.type) {
    case 'ADD_ORDER':
      return addOrder(state, action.orderType, action.now)
    case 'ADD_BOT':
      return addBot(state, action.now)
    case 'REMOVE_BOT':
      return removeNewestBot(state)
    case 'TICK':
      return tick(state, action.now)
  }
}

/**
 * Owns the order controller state for the UI. It exposes role-agnostic actions
 * plus memoized queue selectors so components stay presentation-focused.
 *
 * @example
 * const { pendingOrders, createOrder, createBot } = useOrderController()
 * createOrder('NORMAL')
 * createBot()
 */
export const useOrderController = () => {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState)
  const [clock, setClock] = useState(() => Date.now())

  useEffect(() => {
    // A short interval keeps progress bars smooth while the pure scheduler
    // decides whether any 10-second order has actually completed.
    const intervalId = window.setInterval(() => {
      const now = Date.now()
      setClock(now)
      dispatch({ type: 'TICK', now })
    }, 250)

    return () => window.clearInterval(intervalId)
  }, [])

  const createOrder = useCallback((orderType: OrderType) => {
    const now = Date.now()
    setClock(now)
    dispatch({ type: 'ADD_ORDER', orderType, now })
  }, [])

  const createBot = useCallback(() => {
    const now = Date.now()
    setClock(now)
    dispatch({ type: 'ADD_BOT', now })
  }, [])

  const destroyNewestBot = useCallback(() => {
    dispatch({ type: 'REMOVE_BOT' })
  }, [])

  const pendingOrders = useMemo(() => selectPendingOrders(state.orders), [state.orders])
  const processingOrders = useMemo(() => selectProcessingOrders(state.orders), [state.orders])
  const completeOrders = useMemo(() => selectCompleteOrders(state.orders), [state.orders])

  return {
    state,
    clock,
    pendingOrders,
    processingOrders,
    completeOrders,
    createOrder,
    createBot,
    destroyNewestBot,
  }
}
