import { useCallback, useEffect, useRef, useState } from 'react'

export type OrderType = 'VIP' | 'NORMAL'
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE'

export interface Order {
  id: number
  type: OrderType
  status: OrderStatus
  createdAt: Date
  /** epoch ms when the current PROCESSING run finishes (UI countdown only) */
  endsAt?: number
}

export type BotStatus = 'IDLE' | 'PROCESSING'

export interface Bot {
  id: number
  status: BotStatus
  processingOrderId: number | null
}

/** Each order takes exactly 10 seconds to cook. */
export const PROCESS_MS = 10_000

/**
 * Insert an order into `arr` so that, among PENDING orders, the queue stays:
 * all VIP before all NORMAL, newest within a group goes to the back of its
 * group. Positions of non-PENDING orders are irrelevant (columns filter by
 * status), so we only reason about PENDING neighbours.
 *
 * `arr` must NOT already contain `order`.
 */
function insertPending(arr: Order[], order: Order): void {
  if (order.type === 'VIP') {
    let lastVip = -1
    arr.forEach((o, i) => {
      if (o.status === 'PENDING' && o.type === 'VIP') lastVip = i
    })
    if (lastVip >= 0) {
      arr.splice(lastVip + 1, 0, order)
      return
    }
    const firstNormal = arr.findIndex(
      (o) => o.status === 'PENDING' && o.type === 'NORMAL'
    )
    arr.splice(firstNormal >= 0 ? firstNormal : arr.length, 0, order)
    return
  }
  // NORMAL: behind every pending order.
  let lastPending = -1
  arr.forEach((o, i) => {
    if (o.status === 'PENDING') lastPending = i
  })
  arr.splice(lastPending >= 0 ? lastPending + 1 : arr.length, 0, order)
}

interface Started {
  botId: number
  orderId: number
}

/**
 * Pure step: hand the first PENDING orders to IDLE bots (lowest bot id first).
 * Returns fresh clones plus the list of (bot, order) pairs that just started so
 * the caller can arm their timers.
 */
function reconcile(
  ordersIn: Order[],
  botsIn: Bot[]
): { orders: Order[]; bots: Bot[]; started: Started[] } {
  const orders = ordersIn.map((o) => ({ ...o }))
  const bots = botsIn.map((b) => ({ ...b }))
  const started: Started[] = []

  const idleBots = bots
    .filter((b) => b.status === 'IDLE')
    .sort((a, b) => a.id - b.id)

  for (const bot of idleBots) {
    const next = orders.find((o) => o.status === 'PENDING')
    if (!next) break
    next.status = 'PROCESSING'
    next.endsAt = Date.now() + PROCESS_MS
    bot.status = 'PROCESSING'
    bot.processingOrderId = next.id
    started.push({ botId: bot.id, orderId: next.id })
  }

  return { orders, bots, started }
}

export interface OrderController {
  orders: Order[]
  bots: Bot[]
  now: number
  newNormalOrder: () => void
  newVipOrder: () => void
  addBot: () => void
  removeBot: () => void
}

export function useOrderController(): OrderController {
  const [orders, setOrders] = useState<Order[]>([])
  const [bots, setBots] = useState<Bot[]>([])
  const [now, setNow] = useState(() => Date.now())

  // Refs mirror state so async timer callbacks always read the latest value
  // instead of a stale closure snapshot.
  const ordersRef = useRef<Order[]>([])
  const botsRef = useRef<Bot[]>([])
  const nextOrderId = useRef(1)
  const nextBotId = useRef(1)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const commit = useCallback((o: Order[], b: Bot[]) => {
    ordersRef.current = o
    botsRef.current = b
    setOrders(o)
    setBots(b)
  }, [])

  const startTimer = useCallback((botId: number, orderId: number) => {
    const id = setTimeout(() => completeOrder(botId, orderId), PROCESS_MS)
    timers.current.set(botId, id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const settle = useCallback(
    (o: Order[], b: Bot[]) => {
      const res = reconcile(o, b)
      commit(res.orders, res.bots)
      res.started.forEach((s) => startTimer(s.botId, s.orderId))
    },
    [commit, startTimer]
  )

  const completeOrder = useCallback(
    (botId: number, orderId: number) => {
      timers.current.delete(botId)
      const o = ordersRef.current.map((x) =>
        x.id === orderId
          ? { ...x, status: 'COMPLETE' as OrderStatus, endsAt: undefined }
          : x
      )
      const b = botsRef.current.map((x) =>
        x.id === botId
          ? { ...x, status: 'IDLE' as BotStatus, processingOrderId: null }
          : x
      )
      settle(o, b)
    },
    [settle]
  )

  const newOrder = useCallback(
    (type: OrderType) => {
      const order: Order = {
        id: nextOrderId.current++,
        type,
        status: 'PENDING',
        createdAt: new Date(),
      }
      const o = [...ordersRef.current]
      insertPending(o, order)
      settle(o, [...botsRef.current])
    },
    [settle]
  )

  const newNormalOrder = useCallback(() => newOrder('NORMAL'), [newOrder])
  const newVipOrder = useCallback(() => newOrder('VIP'), [newOrder])

  const addBot = useCallback(() => {
    const bot: Bot = {
      id: nextBotId.current++,
      status: 'IDLE',
      processingOrderId: null,
    }
    settle([...ordersRef.current], [...botsRef.current, bot])
  }, [settle])

  const removeBot = useCallback(() => {
    const b = [...botsRef.current]
    if (b.length === 0) return

    let newestIdx = 0
    for (let i = 1; i < b.length; i++) {
      if (b[i].id > b[newestIdx].id) newestIdx = i
    }
    const bot = b[newestIdx]

    let o = [...ordersRef.current]
    if (bot.status === 'PROCESSING' && bot.processingOrderId != null) {
      const t = timers.current.get(bot.id)
      if (t) clearTimeout(t)
      timers.current.delete(bot.id)

      const ord = o.find((x) => x.id === bot.processingOrderId)
      if (ord) {
        o = o.filter((x) => x.id !== ord.id)
        insertPending(o, {
          ...ord,
          status: 'PENDING',
          endsAt: undefined,
        })
      }
    }

    b.splice(newestIdx, 1)
    settle(o, b)
  }, [settle])

  // Drives the per-card countdown re-render.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])

  // Clear any outstanding cook timers on unmount.
  useEffect(() => {
    const map = timers.current
    return () => {
      map.forEach((t) => clearTimeout(t))
      map.clear()
    }
  }, [])

  return {
    orders,
    bots,
    now,
    newNormalOrder,
    newVipOrder,
    addBot,
    removeBot,
  }
}
