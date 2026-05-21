import { useState, useEffect, useRef, useCallback } from 'react'
import { Order, CustomerType, Bot } from '../types'

interface QueueState {
  orders: Order[]
  bots: Bot[]
}

export const useOrderQueue = () => {
  const [state, setState] = useState<QueueState>({ orders: [], bots: [] })
  const orderIdCounter = useRef(1)
  const botIdCounter = useRef(1)
  const timers = useRef<Map<number, number>>(new Map())

  const addOrder = (customerType: CustomerType) => {
    const newOrder: Order = {
      id: orderIdCounter.current++,
      customerType,
      status: 'PENDING',
      submitTime: Date.now()
    }
    setState(prev => ({ ...prev, orders: [...prev.orders, newOrder] }))
  }

  const addBot = () => {
    const newBot: Bot = {
      id: botIdCounter.current++,
      status: 'IDLE'
    }
    setState(prev => ({ ...prev, bots: [...prev.bots, newBot] }))
  }

  const removeBot = () => {
    setState(prev => {
      if (prev.bots.length === 0) return prev
      
      const lastBot = prev.bots[prev.bots.length - 1]
      
      if (lastBot.orderId !== undefined) {
        const timer = timers.current.get(lastBot.orderId)
        if (timer) {
          clearTimeout(timer)
          timers.current.delete(lastBot.orderId)
        }
        
        return {
          orders: prev.orders.map(order =>
            order.id === lastBot.orderId
              ? { ...order, status: 'PENDING', botId: undefined }
              : order
          ),
          bots: prev.bots.slice(0, -1)
        }
      }
      
      return { ...prev, bots: prev.bots.slice(0, -1) }
    })
  }

  const processOrders = useCallback(() => {
    setState(prev => {
      const idleBots = prev.bots.filter(bot => bot.status === 'IDLE')
      if (idleBots.length === 0) return prev

      const pending = prev.orders.filter(o => o.status === 'PENDING')
      if (pending.length === 0) return prev

      const vipOrders = pending.filter(o => o.customerType === 'VIP')
      const normalOrders = pending.filter(o => o.customerType === 'NORMAL')
      const sortedPending = [...vipOrders, ...normalOrders]
      const toProcess = sortedPending.slice(0, idleBots.length)

      if (toProcess.length === 0) return prev

      toProcess.forEach((order, index) => {
        const bot = idleBots[index]

        const timer = window.setTimeout(() => {
          setState(currentState => ({
            orders: currentState.orders.map(o =>
              o.id === order.id
                ? { ...o, status: 'COMPLETE', botId: undefined, completeTime: Date.now() }
                : o
            ),
            bots: currentState.bots.map(b =>
              b.id === bot.id
                ? { ...b, status: 'IDLE', orderId: undefined }
                : b
            )
          }))
          
          timers.current.delete(order.id)
        }, 10000)

        timers.current.set(order.id, timer)
      })

      return {
        orders: prev.orders.map(order => {
          const orderIndex = toProcess.findIndex(o => o.id === order.id)
          if (orderIndex !== -1) {
            const bot = idleBots[orderIndex]
            return { ...order, status: 'PROCESSING', botId: bot.id }
          }
          return order
        }),
        bots: prev.bots.map(bot => {
          const botIndex = idleBots.findIndex(ib => ib.id === bot.id)
          if (botIndex !== -1 && toProcess[botIndex]) {
            return { ...bot, status: 'PROCESSING', orderId: toProcess[botIndex].id }
          }
          return bot
        })
      }
    })
  }, [])

  useEffect(() => {
    const interval = setInterval(processOrders, 100)

    return () => {
      clearInterval(interval)
      timers.current.forEach(timer => clearTimeout(timer))
      timers.current.clear()
    }
  }, [processOrders])

  return { 
    orders: state.orders, 
    bots: state.bots, 
    addOrder, 
    addBot, 
    removeBot 
  }
}
