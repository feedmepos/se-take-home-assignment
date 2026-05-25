import { useEffect, useMemo, useReducer, useRef } from 'react'
import './App.css'

type OrderType = 'VIP' | 'NORMAL'
type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE'
type BotStatus = 'IDLE' | 'PROCESSING'

type Order = {
  id: number
  type: OrderType
  status: OrderStatus
  createdAt: number
  startedAt?: number
  completedAt?: number
  botId?: number
}

type Bot = {
  id: number
  status: BotStatus
  orderId?: number
}

type State = {
  nextOrderId: number
  nextBotId: number
  pending: Order[]
  processing: Order[]
  complete: Order[]
  bots: Bot[]
}

type Action =
  | { type: 'ADD_ORDER'; orderType: OrderType; now: number }
  | { type: 'ADD_BOT'; now: number }
  | { type: 'REMOVE_BOT'; now: number }
  | { type: 'COMPLETE_ORDER'; botId: number; orderId: number; now: number }

const PROCESSING_TIME_MS = 10_000

const initialState: State = {
  nextOrderId: 1,
  nextBotId: 1,
  pending: [],
  processing: [],
  complete: [],
  bots: [],
}

function insertPendingOrder(pending: Order[], order: Order) {
  return [...pending, order].sort((firstOrder, secondOrder) => {
    if (firstOrder.type !== secondOrder.type) {
      return firstOrder.type === 'VIP' ? -1 : 1
    }

    return firstOrder.id - secondOrder.id
  })
}

function assignPendingOrders(state: State, now: number): State {
  const pending = [...state.pending]
  const processing = [...state.processing]
  const bots = state.bots.map((bot) => ({ ...bot }))

  for (const bot of bots) {
    if (bot.status === 'PROCESSING' || pending.length === 0) {
      continue
    }

    const nextOrder = pending.shift()
    if (!nextOrder) {
      break
    }

    const processingOrder: Order = {
      ...nextOrder,
      status: 'PROCESSING',
      startedAt: now,
      botId: bot.id,
    }

    bot.status = 'PROCESSING'
    bot.orderId = processingOrder.id
    processing.push(processingOrder)
  }

  return { ...state, pending, processing, bots }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_ORDER': {
      const order: Order = {
        id: state.nextOrderId,
        type: action.orderType,
        status: 'PENDING',
        createdAt: action.now,
      }

      return assignPendingOrders(
        {
          ...state,
          nextOrderId: state.nextOrderId + 1,
          pending: insertPendingOrder(state.pending, order),
        },
        action.now,
      )
    }

    case 'ADD_BOT': {
      const bot: Bot = {
        id: state.nextBotId,
        status: 'IDLE',
      }

      return assignPendingOrders(
        {
          ...state,
          nextBotId: state.nextBotId + 1,
          bots: [...state.bots, bot],
        },
        action.now,
      )
    }

    case 'REMOVE_BOT': {
      const newestBot = state.bots[state.bots.length - 1]
      if (!newestBot) {
        return state
      }

      const remainingBots = state.bots.slice(0, -1)
      const interruptedOrder = state.processing.find((order) => order.botId === newestBot.id)
      const remainingProcessing = state.processing.filter((order) => order.botId !== newestBot.id)

      const pending = interruptedOrder
        ? insertPendingOrder(state.pending, {
            ...interruptedOrder,
            status: 'PENDING',
            startedAt: undefined,
            botId: undefined,
          })
        : state.pending

      return assignPendingOrders(
        {
          ...state,
          bots: remainingBots,
          processing: remainingProcessing,
          pending,
        },
        action.now,
      )
    }

    case 'COMPLETE_ORDER': {
      const completedOrder = state.processing.find(
        (order) => order.id === action.orderId && order.botId === action.botId,
      )

      if (!completedOrder) {
        return state
      }

      const bots = state.bots.map((bot) =>
        bot.id === action.botId
          ? { id: bot.id, status: 'IDLE' as const }
          : bot,
      )

      return assignPendingOrders(
        {
          ...state,
          bots,
          processing: state.processing.filter((order) => order.id !== action.orderId),
          complete: [
            {
              ...completedOrder,
              status: 'COMPLETE',
              completedAt: action.now,
            },
            ...state.complete,
          ],
        },
        action.now,
      )
    }

    default:
      return state
  }
}

function formatTime(timestamp?: number) {
  if (!timestamp) {
    return '--:--:--'
  }

  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(timestamp)
}

function OrderCard({ order, now }: { order: Order; now: number }) {
  const progress =
    order.status === 'PROCESSING' && order.startedAt
      ? Math.min(100, ((now - order.startedAt) / PROCESSING_TIME_MS) * 100)
      : 0

  return (
    <article className={`order-card ${order.type.toLowerCase()}`}>
      <div className="order-card__header">
        <strong>Order #{order.id}</strong>
        <span>{order.type}</span>
      </div>
      <div className="order-card__meta">
        <span>{order.status}</span>
        {order.botId ? <span>Bot #{order.botId}</span> : null}
      </div>
      {order.status === 'PROCESSING' ? (
        <div className="progress" aria-label={`Order ${order.id} progress`}>
          <div style={{ width: `${progress}%` }} />
        </div>
      ) : null}
      <div className="order-card__time">
        {order.status === 'COMPLETE'
          ? `Completed ${formatTime(order.completedAt)}`
          : `Created ${formatTime(order.createdAt)}`}
      </div>
    </article>
  )
}

function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [now, forceClock] = useReducer(() => Date.now(), Date.now())
  const timers = useRef(new Map<number, number>())

  useEffect(() => {
    const clock = window.setInterval(() => forceClock(), 250)
    return () => window.clearInterval(clock)
  }, [])

  useEffect(() => {
    const activeBotIds = new Set(state.processing.map((order) => order.botId))

    for (const order of state.processing) {
      if (!order.botId || timers.current.has(order.botId)) {
        continue
      }

      const remainingTime = Math.max(
        0,
        PROCESSING_TIME_MS - (Date.now() - (order.startedAt ?? Date.now())),
      )

      const timerId = window.setTimeout(() => {
        timers.current.delete(order.botId!)
        dispatch({
          type: 'COMPLETE_ORDER',
          botId: order.botId!,
          orderId: order.id,
          now: Date.now(),
        })
      }, remainingTime)

      timers.current.set(order.botId, timerId)
    }

    for (const [botId, timerId] of timers.current) {
      if (!activeBotIds.has(botId)) {
        window.clearTimeout(timerId)
        timers.current.delete(botId)
      }
    }
  }, [state.processing])

  useEffect(() => {
    const activeTimers = timers.current

    return () => {
      for (const timerId of activeTimers.values()) {
        window.clearTimeout(timerId)
      }
    }
  }, [])

  const stats = useMemo(() => {
    const idleBots = state.bots.filter((bot) => bot.status === 'IDLE').length
    return {
      totalBots: state.bots.length,
      idleBots,
      processingBots: state.bots.length - idleBots,
      pendingOrders: state.pending.length,
      completedOrders: state.complete.length,
    }
  }, [state])

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">McDonald's Kitchen Control</p>
          <h1>Order Controller</h1>
        </div>
        <div className="actions" aria-label="Order and bot controls">
          <button onClick={() => dispatch({ type: 'ADD_ORDER', orderType: 'NORMAL', now: Date.now() })}>
            New Normal Order
          </button>
          <button className="vip-action" onClick={() => dispatch({ type: 'ADD_ORDER', orderType: 'VIP', now: Date.now() })}>
            New VIP Order
          </button>
          <button onClick={() => dispatch({ type: 'ADD_BOT', now: Date.now() })}>+ Bot</button>
          <button onClick={() => dispatch({ type: 'REMOVE_BOT', now: Date.now() })} disabled={state.bots.length === 0}>
            - Bot
          </button>
        </div>
      </section>

      <section className="stats-grid" aria-label="System summary">
        <div>
          <span>{stats.totalBots}</span>
          <p>Total Bots</p>
        </div>
        <div>
          <span>{stats.idleBots}</span>
          <p>Idle Bots</p>
        </div>
        <div>
          <span>{stats.processingBots}</span>
          <p>Processing</p>
        </div>
        <div>
          <span>{stats.pendingOrders}</span>
          <p>Pending Orders</p>
        </div>
        <div>
          <span>{stats.completedOrders}</span>
          <p>Completed</p>
        </div>
      </section>

      <section className="workspace">
        <section className="panel">
          <div className="panel__header">
            <h2>Pending</h2>
            <span>{state.pending.length}</span>
          </div>
          <div className="order-list">
            {state.pending.length ? (
              state.pending.map((order) => <OrderCard key={order.id} order={order} now={now} />)
            ) : (
              <p className="empty-state">No pending orders</p>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel__header">
            <h2>Processing</h2>
            <span>{state.processing.length}</span>
          </div>
          <div className="order-list">
            {state.processing.length ? (
              state.processing.map((order) => <OrderCard key={order.id} order={order} now={now} />)
            ) : (
              <p className="empty-state">No active cooking jobs</p>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel__header">
            <h2>Complete</h2>
            <span>{state.complete.length}</span>
          </div>
          <div className="order-list">
            {state.complete.length ? (
              state.complete.map((order) => <OrderCard key={order.id} order={order} now={now} />)
            ) : (
              <p className="empty-state">No completed orders</p>
            )}
          </div>
        </section>
      </section>

      <section className="bot-panel">
        <div className="panel__header">
          <h2>Cooking Bots</h2>
          <span>{state.bots.length}</span>
        </div>
        <div className="bot-list">
          {state.bots.length ? (
            state.bots.map((bot) => (
              <article className="bot-card" key={bot.id}>
                <strong>Bot #{bot.id}</strong>
                <span className={bot.status === 'IDLE' ? 'idle' : 'busy'}>{bot.status}</span>
                <p>{bot.orderId ? `Handling Order #${bot.orderId}` : 'Waiting for pending orders'}</p>
              </article>
            ))
          ) : (
            <p className="empty-state">No bots created</p>
          )}
        </div>
      </section>
    </main>
  )
}

export default App
