import { type ReactNode, useEffect, useReducer, useState } from 'react'
import { ActionPanel } from './components/ActionPanel'
import { RoleTabs } from './components/RoleTabs'
import {
  BotIcon,
  CompletedIcon,
  ProcessingIcon,
  QueueIcon,
} from './components/icons/UiIcons'
import type { Action, Bot, Order, OrderType, RoleTab, State } from './types'

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

const insertWithPriority = (queue: Order[], order: Order): Order[] =>
  [...queue, order].sort((a, b) => {
    const byPriority = getPriorityRank(a.type) - getPriorityRank(b.type)
    if (byPriority !== 0) {
      return byPriority
    }
    return a.id - b.id
  })

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

      return assignPendingOrders({
        ...state,
        bots: remainingBots,
        pendingOrders,
      })
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

      const completedBotIds = new Set(completedBots.map((bot) => bot.id))
      const completedOrders = completedBots.map((bot) => ({
        ...bot.currentOrder!,
        completedAt: action.now,
      }))

      const nextBots = state.bots.map((bot): Bot =>
        completedBotIds.has(bot.id)
          ? { ...bot, status: 'IDLE', currentOrder: null, startedAt: null }
          : bot,
      )

      return assignPendingOrders({
        ...state,
        bots: nextBots,
        completedOrders: [...state.completedOrders, ...completedOrders],
      })
    }
    default:
      return state
  }
}

function App() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState)
  const [now, setNow] = useState(() => Date.now())
  const [activeTab, setActiveTab] = useState<RoleTab>('CUSTOMER')

  useEffect(() => {
    const runTick = () => dispatch({ type: 'PROCESS_TICK', now: Date.now() })
    const intervalId = window.setInterval(runTick, 500)
    const onFocusOrVisibility = () => runTick()

    window.addEventListener('focus', onFocusOrVisibility)
    document.addEventListener('visibilitychange', onFocusOrVisibility)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', onFocusOrVisibility)
      document.removeEventListener('visibilitychange', onFocusOrVisibility)
    }
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(intervalId)
  }, [])

  const processingCount = state.bots.filter((bot) => bot.status === 'PROCESSING').length

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#da291c]">
              <span className="text-xl font-black leading-none text-[#ffbc0d]">M</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">McDonald Order Controller</h1>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Prototype mode: switch role tabs to control actions, while the board stays shared.
          </p>
          <RoleTabs activeTab={activeTab} onChange={setActiveTab} />
          <ActionPanel activeTab={activeTab} dispatch={dispatch} />
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Bots"
            value={state.bots.length}
            icon={<BotIcon className="h-4 w-4 text-amber-500" />}
          />
          <StatCard
            label="Processing"
            value={processingCount}
            icon={<ProcessingIcon className="h-4 w-4" />}
          />
          <StatCard
            label="Pending"
            value={state.pendingOrders.length}
            icon={<QueueIcon className="h-4 w-4 text-rose-600" />}
          />
          <StatCard
            label="Complete"
            value={state.completedOrders.length}
            icon={<CompletedIcon className="h-4 w-4 text-emerald-600" />}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <QueueIcon className="h-5 w-5 text-rose-600" />
              Pending
            </h2>
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
                  <OrderTypeBadge type={order.type} />
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <BotIcon className="h-5 w-5 text-amber-500" />
              Bots
            </h2>
            <ul className="mt-4 space-y-2">
              {state.bots.length === 0 && (
                <li className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500">
                  No bots available
                </li>
              )}
              {state.bots.map((bot) => (
                <li key={bot.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
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
                      Completes in{' '}
                      {Math.max(
                        0,
                        Math.ceil((PROCESS_TIME_MS - (now - bot.startedAt)) / 1000),
                      )}
                      s
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <CompletedIcon className="h-5 w-5 text-emerald-600" />
              Complete
            </h2>
            <ul className="mt-4 space-y-2">
              {state.completedOrders.length === 0 && (
                <li className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500">
                  No completed orders
                </li>
              )}
              {state.completedOrders.map((order) => (
                <li key={order.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Order #{order.id}</span>
                    <OrderTypeBadge type={order.type} />
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

function OrderTypeBadge({ type }: { type: OrderType }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-semibold ${
        type === 'VIP' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
      }`}
    >
      {type}
    </span>
  )
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: number
  icon?: ReactNode
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  )
}

export default App
