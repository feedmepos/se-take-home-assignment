import { createContext, useReducer, useRef, useEffect } from 'react'
import type { ReactNode } from 'react'
import { orderReducer, initialState } from '../reducer/orderReducer'
import type { AppState, Action } from '../reducer/types'

interface OrderContextValue {
  state: AppState
  dispatch: React.Dispatch<Action>
}

export const OrderContext = createContext<OrderContextValue | null>(null)

export function OrderProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(orderReducer, initialState)
  const botTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    state.bots.forEach(bot => {
      if (bot.status === 'PROCESSING' && !(bot.id in botTimers.current)) {
        botTimers.current[bot.id] = setTimeout(() => {
          dispatch({ type: 'ORDER_COMPLETE', botId: bot.id })
          delete botTimers.current[bot.id]
        }, 10000)
      }
    })

    Object.keys(botTimers.current).forEach(key => {
      const botId = Number(key)
      const bot = state.bots.find(b => b.id === botId)
      if (!bot || bot.status === 'IDLE') {
        clearTimeout(botTimers.current[botId])
        delete botTimers.current[botId]
      }
    })
  }, [state.bots])

  return (
    <OrderContext.Provider value={{ state, dispatch }}>
      {children}
    </OrderContext.Provider>
  )
}
