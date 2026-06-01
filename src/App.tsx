import { useEffect, useReducer, useState } from 'react'

type OrderType = 'VIP' | 'NORMAL'
type BotStatus = 'IDLE' | 'PROCESSING'

type Order = {
  id: number
  type: OrderType
}

type CompletedOrder = Order & {
  completedAt: number
}

type Bot = {
  id: number
  status: BotStatus
  currentOrder: Order | null
  startedAt: number | null
}

type State = {
  nextOrderId: number
  nextBotId: number
  pendingOrders: Order[]
  completedOrders: CompletedOrder[]
  bots: Bot[]
}

type Action =
  | { type: 'ADD_ORDER'; orderType: OrderType }
  | { type: 'ADD_BOT' }
  | { type: 'REMOVE_BOT' }
  | { type: 'PROCESS_TICK'; now: number }

const PROCESS_TIME_MS = 10_000

const createInitialState = (): State => ({
  nextOrderId: 1,
  nextBotId: 1,
  pendingOrders: [],
  completedOrders: [],
  bots: [],
})

const formatClockTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString('en-GB', { hour12: false })

const getPriorityRank = (type: OrderType): number => (type === 'VIP' ? 0 : 1)

const insertWithPriority = (queue: Order[], order: Order): Order[] => {
  return [...queue, order].sort((a, b) => {
    const byPriority = getPriorityRank(a.type) - getPriorityRank(b.type)
    if (byPriority !== 0) {
      return byPriority
    }
    return a.id - b.id
  })
}

const assignPendingOrders = (state: State): State => {
  if (state.pendingOrders.length === 0 || state.bots.length === 0) {
    return state
  }

  const nextPending = [...state.pendingOrders]
  const nextBots = state.bots.map((bot) => ({ ...bot }))

  for (const bot of nextBots) {
    if (bot.status === 'IDLE' && nextPending.length > 0) {
      const order = nextPending.shift()!
      bot.status = 'PROCESSING'
      bot.currentOrder = order
      bot.startedAt = Date.now()
    }
  }

  return {
    ...state,
    pendingOrders: nextPending,
    bots: nextBots,
  }
}

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'ADD_ORDER': {
      const order: Order = { id: state.nextOrderId, type: action.orderType }
      const nextState: State = {
        ...state,
        nextOrderId: state.nextOrderId + 1,
        pendingOrders: insertWithPriority(state.pendingOrders, order),
      }
      return assignPendingOrders(nextState)
    }
    case 'ADD_BOT': {
      const bot: Bot = {
        id: state.nextBotId,
        status: 'IDLE',
        currentOrder: null,
        startedAt: null,
      }
      const nextState: State = {
        ...state,
        nextBotId: state.nextBotId + 1,
        bots: [...state.bots, bot],
      }
      return assignPendingOrders(nextState)
    }
    case 'REMOVE_BOT': {
      if (state.bots.length === 0) {
        return state
      }

      const newestBot = state.bots[state.bots.length - 1]
      const remainingBots = state.bots.slice(0, -1)

      let pendingOrders = [...state.pendingOrders]
      if (newestBot.currentOrder) {
        pendingOrders = insertWithPriority(pendingOrders, newestBot.currentOrder)
      }

      const nextState: State = {
        ...state,
        bots: remainingBots,
        pendingOrders,
      }
      return assignPendingOrders(nextState)
    }
    case 'PROCESS_TICK': {
      const completedBots = state.bots.filter(
        (bot) =>
          bot.status === 'PROCESSING' &&
          bot.currentOrder &&
          bot.startedAt !== null &&
          action.now - bot.startedAt >= PROCESS_TIME_MS,
      )

      if (completedBots.length === 0) {
        return state
      }

      const completedOrderIds = new Set(completedBots.map((bot) => bot.id))
      const completedOrders = completedBots
        .map((bot) => ({
          ...bot.currentOrder!,
          completedAt: action.now,
        }))
        .filter(Boolean)

      const nextBots = state.bots.map((bot): Bot =>
        completedOrderIds.has(bot.id)
          ? { ...bot, status: 'IDLE', currentOrder: null, startedAt: null }
          : bot,
      )

      const nextState = {
        ...state,
        bots: nextBots,
        completedOrders: [...state.completedOrders, ...completedOrders],
      }
      return assignPendingOrders(nextState)
    }
    default:
      return state
  }
}

function App() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const runTick = () => dispatch({ type: 'PROCESS_TICK', now: Date.now() })
    const intervalId = window.setInterval(runTick, 500)
    const onVisibilityOrFocus = () => runTick()

    window.addEventListener('focus', onVisibilityOrFocus)
    document.addEventListener('visibilitychange', onVisibilityOrFocus)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', onVisibilityOrFocus)
      document.removeEventListener('visibilitychange', onVisibilityOrFocus)
    }
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(intervalId)
  }, [])

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-bold tracking-tight">McDonald Order Controller</h1>
          <p className="mt-2 text-sm text-slate-600">
            VIP orders are always queued before normal orders. Each bot processes one order in 10 seconds.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              onClick={() => dispatch({ type: 'ADD_ORDER', orderType: 'NORMAL' })}
            >
              New Normal Order
            </button>
            <button
              type="button"
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-400"
              onClick={() => dispatch({ type: 'ADD_ORDER', orderType: 'VIP' })}
            >
              New VIP Order
            </button>
            <button
              type="button"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
              onClick={() => dispatch({ type: 'ADD_BOT' })}
            >
              + Bot
            </button>
            <button
              type="button"
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
              onClick={() => dispatch({ type: 'REMOVE_BOT' })}
            >
              - Bot
            </button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-wide text-slate-500">Bots</p>
            <p className="mt-1 text-2xl font-semibold">{state.bots.length}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-wide text-slate-500">Processing</p>
            <p className="mt-1 text-2xl font-semibold">
              {state.bots.filter((bot) => bot.status === 'PROCESSING').length}
            </p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-wide text-slate-500">Pending</p>
            <p className="mt-1 text-2xl font-semibold">{state.pendingOrders.length}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-wide text-slate-500">Complete</p>
            <p className="mt-1 text-2xl font-semibold">{state.completedOrders.length}</p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold">Pending</h2>
            <ul className="mt-4 space-y-2">
              {state.pendingOrders.length === 0 && (
                <li className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500">
                  No pending orders
                </li>
              )}
              {state.pendingOrders.map((order) => (
                <li
                  key={order.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3"
                >
                  <span className="text-sm font-medium">Order #{order.id}</span>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      order.type === 'VIP'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {order.type}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold">Bots</h2>
            <ul className="mt-4 space-y-2">
              {state.bots.length === 0 && (
                <li className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500">
                  No bots available
                </li>
              )}
              {state.bots.map((bot) => (
                <li
                  key={bot.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Bot #{bot.id}</span>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        bot.status === 'IDLE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {bot.status}
                    </span>
                  </div>
                  {bot.currentOrder && (
                    <p className="mt-2 text-sm text-slate-600">
                      Processing order #{bot.currentOrder.id} ({bot.currentOrder.type})
                    </p>
                  )}
                  {bot.status === 'PROCESSING' && bot.startedAt !== null && (
                    <p className="mt-1 text-xs font-medium text-blue-700">
                      {`Completes in ${Math.max(
                        0,
                        Math.ceil((PROCESS_TIME_MS - (now - bot.startedAt)) / 1000),
                      )}s`}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold">Complete</h2>
            <ul className="mt-4 space-y-2">
              {state.completedOrders.length === 0 && (
                <li className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500">
                  No completed orders
                </li>
              )}
              {state.completedOrders.map((order) => (
                <li
                  key={order.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Order #{order.id}</span>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        order.type === 'VIP'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {order.type}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Completed at {formatClockTime(order.completedAt)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  )
}

export default App
