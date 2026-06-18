import { useCallback, useEffect, useRef, useState } from 'react'
import type { Bot, Order, OrderType } from '../types'
import { insertNormalOrder, insertVipOrder, restoreOrder } from './orderQueue'

const PROCESSING_TIME_MS = 10_000

export function useOrderSystem() {
  const [pendingOrders, setPendingOrders] = useState<Order[]>([])
  const [completeOrders, setCompleteOrders] = useState<Order[]>([])
  const [bots, setBots] = useState<Bot[]>([])

  const nextOrderIdRef = useRef(1)
  const nextBotIdRef = useRef(1)
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  const pendingRef = useRef<Order[]>([])
  const botsRef = useRef<Bot[]>([])
  const ordersByIdRef = useRef<Map<number, Order>>(new Map())

  useEffect(() => {
    pendingRef.current = pendingOrders
  }, [pendingOrders])

  useEffect(() => {
    botsRef.current = bots
  }, [bots])

  const syncPending = useCallback((next: Order[]) => {
    pendingRef.current = next
    setPendingOrders(next)
  }, [])

  const syncBots = useCallback((next: Bot[]) => {
    botsRef.current = next
    setBots(next)
  }, [])

  const clearBotTimer = useCallback((botId: number) => {
    const timer = timersRef.current.get(botId)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(botId)
    }
  }, [])

  const assignOrderToBot = useCallback(
    (botId: number) => {
      const pending = pendingRef.current
      if (pending.length === 0) return

      const order = pending[0]
      const originalPendingIndex = 0

      syncPending(pending.slice(1))
      syncBots(
        botsRef.current.map((bot) =>
          bot.id === botId
            ? {
                ...bot,
                status: 'processing' as const,
                currentOrderId: order.id,
                originalPendingIndex,
              }
            : bot,
        ),
      )

      const timer = setTimeout(() => {
        timersRef.current.delete(botId)
        setCompleteOrders((prev) => [...prev, order])
        syncBots(
          botsRef.current.map((bot) =>
            bot.id === botId
              ? {
                  ...bot,
                  status: 'idle' as const,
                  currentOrderId: null,
                  originalPendingIndex: null,
                }
              : bot,
          ),
        )
        assignOrderToBot(botId)
      }, PROCESSING_TIME_MS)

      timersRef.current.set(botId, timer)
    },
    [syncPending, syncBots],
  )

  const tryAssignIdleBots = useCallback(() => {
    for (const bot of botsRef.current) {
      if (bot.status === 'idle' && pendingRef.current.length > 0) {
        assignOrderToBot(bot.id)
      }
    }
  }, [assignOrderToBot])

  const addOrder = useCallback(
    (type: OrderType) => {
      const order: Order = { id: nextOrderIdRef.current, type }
      nextOrderIdRef.current += 1
      ordersByIdRef.current.set(order.id, order)
      syncPending(
        type === 'vip'
          ? insertVipOrder(pendingRef.current, order)
          : insertNormalOrder(pendingRef.current, order),
      )
      tryAssignIdleBots()
    },
    [syncPending, tryAssignIdleBots],
  )

  const addBot = useCallback(() => {
    const botId = nextBotIdRef.current
    nextBotIdRef.current += 1
    const newBot: Bot = {
      id: botId,
      status: 'idle',
      currentOrderId: null,
      originalPendingIndex: null,
    }
    syncBots([...botsRef.current, newBot])
    assignOrderToBot(botId)
  }, [syncBots, assignOrderToBot])

  const removeBot = useCallback(() => {
    if (botsRef.current.length === 0) return

    const newestBot = botsRef.current.reduce((a, b) => (a.id > b.id ? a : b))
    clearBotTimer(newestBot.id)

    if (
      newestBot.status === 'processing' &&
      newestBot.currentOrderId !== null &&
      newestBot.originalPendingIndex !== null
    ) {
      const order = ordersByIdRef.current.get(newestBot.currentOrderId)
      if (order) {
        syncPending(restoreOrder(pendingRef.current, order))
      }
    }

    syncBots(botsRef.current.filter((bot) => bot.id !== newestBot.id))
  }, [clearBotTimer, syncPending, syncBots])

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer))
      timersRef.current.clear()
    }
  }, [])

  return {
    pendingOrders,
    completeOrders,
    bots,
    addNormalOrder: () => addOrder('normal'),
    addVipOrder: () => addOrder('vip'),
    addBot,
    removeBot,
  }
}
