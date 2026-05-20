import { useState, useEffect, useRef } from 'react'
import './index.css'

// ── constants ──────────────────────────────────────────────────────────────
const PROCESS_TIME_MS = 10_000

// ── id counters ────────────────────────────────────────────────────────────
let _orderId = 1
let _botId = 1
const nextOrderId = () => _orderId++
const nextBotId = () => _botId++

// ── helpers ────────────────────────────────────────────────────────────────
function createOrder(type) {
  return { id: nextOrderId(), type, status: 'PENDING', createdAt: Date.now() }
}

// New order joins the back of its priority group
function insertOrder(queue, order) {
  if (order.type === 'NORMAL') return [...queue, order]
  const lastVipIdx = queue.map(o => o.type).lastIndexOf('VIP')
  const pos = lastVipIdx + 1
  return [...queue.slice(0, pos), order, ...queue.slice(pos)]
}

// Returned order (from a removed bot) goes to the front of its priority group
function reinsertOrder(queue, order) {
  if (order.type === 'VIP') return [order, ...queue]
  const firstNormalIdx = queue.findIndex(o => o.type === 'NORMAL')
  if (firstNormalIdx === -1) return [...queue, order]
  return [...queue.slice(0, firstNormalIdx), order, ...queue.slice(firstNormalIdx)]
}

// ── sub-components ─────────────────────────────────────────────────────────

function OrderCard({ order, isProcessing }) {
  const isVip = order.type === 'VIP'
  return (
    <div className={[
      'flex items-center justify-between rounded-xl px-7 py-4 font-medium border shadow-sm transition-all',
      isVip ? 'bg-yellow-400 border-yellow-400 text-yellow-900' : 'bg-white border-gray-200 text-gray-700',
      isProcessing ? 'ring-2 ring-blue-400' : '',
    ].join(' ')}>
      <span className="flex items-center gap-3 text-base" style={{ padding: '0.25rem 0.5rem' }}>
        {isVip && (
          <span className="rounded-full bg-yellow-900 px-3 py-1 text-xs font-bold text-yellow-400">VIP</span>
        )}
        Order #{order.id}
      </span>
      {isProcessing && (
        <span className="flex items-center gap-2 text-blue-500 text-sm" style={{ padding: '0.25rem 0.5rem' }}>
          <span className="inline-block h-2 w-2 animate-ping rounded-full bg-blue-400" />
          Processing…
        </span>
      )}
    </div>
  )
}

function BotCard({ bot }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!bot.startedAt) { setElapsed(0); return }
    const id = setInterval(() => setElapsed(Math.min(Date.now() - bot.startedAt, PROCESS_TIME_MS)), 100)
    return () => clearInterval(id)
  }, [bot.startedAt])

  const pct = bot.startedAt ? (elapsed / PROCESS_TIME_MS) * 100 : 0
  const active = !!bot.orderId

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-gray-800 text-sm" style={{ padding: '0.25rem 0.5rem' }}>Bot #{bot.id}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`} style={{ padding: '0.25rem 0.5rem' }}>
          {active ? 'ACTIVE' : 'IDLE'}
        </span>
      </div>
      {active ? (
        <>
          <p className="text-xs text-gray-500 mb-2" style={{ padding: '0.25rem 0.5rem' }}>Order #{bot.orderId}</p>
          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full bg-blue-500 transition-all duration-100" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1 text-right" style={{ padding: '0.25rem 0.5rem' }}>{(elapsed / 1000).toFixed(1)}s / 10s</p>
        </>
      ) : (
        <p className="text-xs text-gray-400" style={{ padding: '0.25rem 0.5rem' }}>Waiting for orders…</p>
      )}
    </div>
  )
}

function CompletedCard({ order }) {
  const isVip = order.type === 'VIP'
  const time = new Date(order.completedAt).toLocaleTimeString('en-GB')
  return (
    <div className={[
      'flex items-center justify-between rounded-xl px-7 py-4 border shadow-sm',
      isVip ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-green-50 border-green-200 text-green-800',
    ].join(' ')}>
      <span className="flex items-center gap-3 text-base font-medium" style={{ padding: '0.25rem 0.5rem' }}>
        {isVip && (
          <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-yellow-900">VIP</span>
        )}
        Order #{order.id}
      </span>
      <span className="text-sm opacity-60" style={{ padding: '0.25rem 0.5rem' }}>{time}</span>
    </div>
  )
}

// ── App ────────────────────────────────────────────────────────────────────

export default function App() {
  const [pending, setPending] = useState([])
  const [completed, setCompleted] = useState([])
  const [bots, setBots] = useState([])

  // Refs hold timer IDs and in-flight orders keyed by botId.
  // Using refs (not state) means removeBot always reads the latest value
  // synchronously, and setTimeout is never called inside a state updater
  // (which React Strict Mode would double-invoke, creating orphaned timers).
  const botTimers = useRef({})  // { [botId]: timerId }
  const botOrders = useRef({})  // { [botId]: order }
  const pendingRef = useRef([])
  const botsRef   = useRef([])
  pendingRef.current = pending
  botsRef.current   = bots

  const startProcessing = (botId, order) => {
    const timerId = setTimeout(() => onComplete(botId, order), PROCESS_TIME_MS)
    botTimers.current[botId] = timerId
    botOrders.current[botId] = order
    setBots(bs => bs.map(b => b.id === botId ? { ...b, orderId: order.id, startedAt: Date.now() } : b))
  }

  const onComplete = (botId, order) => {
    delete botTimers.current[botId]
    delete botOrders.current[botId]
    setCompleted(c => [...c, { ...order, status: 'COMPLETE', completedAt: Date.now() }])
    setBots(bs => bs.map(b => b.id === botId ? { ...b, orderId: null, startedAt: null } : b))
    // pick next order — read ref so we see the latest queue without waiting for a render
    const queue = pendingRef.current
    if (queue.length > 0) {
      const [next, ...rest] = queue
      setPending(rest)
      startProcessing(botId, next)
    }
  }

  const addOrder = (type) => {
    const order = createOrder(type)
    const idleBot = botsRef.current.find(b => !b.orderId)
    if (idleBot) {
      startProcessing(idleBot.id, order)
    } else {
      setPending(prev => insertOrder(prev, order))
    }
  }

  const addBot = () => {
    const bot = { id: nextBotId(), orderId: null, startedAt: null }
    setBots(prev => [...prev, bot])
    const queue = pendingRef.current
    if (queue.length > 0) {
      const [order, ...rest] = queue
      setPending(rest)
      startProcessing(bot.id, order)
    }
  }

  const removeBot = () => {
    const bs = botsRef.current
    if (bs.length === 0) return
    const bot = bs[bs.length - 1]

    // Cancel the timer — refs are always current, so this is guaranteed to work
    if (botTimers.current[bot.id]) {
      clearTimeout(botTimers.current[bot.id])
      delete botTimers.current[bot.id]
    }

    // Return in-progress order back to the queue at its correct position
    const order = botOrders.current[bot.id]
    if (order) {
      delete botOrders.current[bot.id]
      setPending(q => reinsertOrder(q, { ...order, status: 'PENDING' }))
    }

    setBots(prev => prev.slice(0, -1))
  }

  const removeAllBots = () => {
    const ordersToReturn = []
    botsRef.current.forEach(bot => {
      if (botTimers.current[bot.id]) {
        clearTimeout(botTimers.current[bot.id])
        delete botTimers.current[bot.id]
      }
      if (botOrders.current[bot.id]) {
        ordersToReturn.push(botOrders.current[bot.id])
        delete botOrders.current[bot.id]
      }
    })
    if (ordersToReturn.length > 0) {
      // reinsert all returned orders respecting priority
      setPending(q => ordersToReturn.reduce((acc, order) => reinsertOrder(acc, { ...order, status: 'PENDING' }), q))
    }
    setBots([])
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="w-full py-8 flex flex-wrap items-center gap-4 justify-between" style={{ paddingLeft: 32, paddingRight: 32 }}>
          {/* Brand */}
          <div className="flex items-center gap-3" style={{ paddingTop: 6, paddingBottom: 6 }}>
            <img src="/Mcd.png" alt="McDonald's" className="w-10 h-10 shrink-0" />
            <div>
              <p className="font-bold text-gray-900 text-base leading-none">McDonald's</p>
              <p className="text-gray-400 text-xs mt-0.5">Order Management System</p>
            </div>
          </div>
          {/* Buttons */}
          <div className="flex flex-wrap gap-4" style={{ paddingTop: 6, paddingBottom: 6 }}>
            <button
              onClick={() => addOrder('NORMAL')}
              className="rounded-full border-2 border-gray-400 bg-white text-gray-800 font-semibold px-6 py-2.5 text-sm hover:bg-gray-50 active:scale-95 transition whitespace-nowrap"
              style={{ padding: '0.25rem 0.5rem' }}
            >
              + Normal Order
            </button>
            <button
              onClick={() => addOrder('VIP')}
              className="rounded-full border-2 border-yellow-400 bg-yellow-400 text-yellow-900 font-semibold px-6 py-2.5 text-sm hover:bg-yellow-300 hover:border-yellow-300 active:scale-95 transition whitespace-nowrap"
              style={{ padding: '0.25rem 0.5rem' }}
            >
              + VIP Order
            </button>
            <button
              onClick={addBot}
              className="rounded-full border-2 border-green-500 bg-green-500 text-white font-semibold px-6 py-2.5 text-sm hover:bg-green-400 hover:border-green-400 active:scale-95 transition whitespace-nowrap"
              style={{ padding: '0.25rem 0.5rem' }}
            >
              + Bot
            </button>
            <button
              onClick={removeBot}
              disabled={bots.length === 0}
              className="rounded-full border-2 border-red-500 bg-red-500 text-white font-semibold px-6 py-2.5 text-sm hover:bg-red-400 hover:border-red-400 active:scale-95 transition whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ padding: '0.25rem 0.5rem' }}
            >
              - Bot
            </button>
            <button
              onClick={removeAllBots}
              disabled={bots.length === 0}
              className="rounded-full border-2 border-black bg-black text-white font-semibold px-6 py-2.5 text-sm hover:bg-gray-800 hover:border-gray-800 active:scale-95 transition whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ padding: '0.25rem 0.5rem' }}
            >
              - All
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col" style={{ padding: '32px 32px 32px' }}>
        {/* ── Bots ── */}
        {bots.length > 0 && (
          <section style={{ marginBottom: 36 }}>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              Cooking Bots ({bots.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {bots.map(bot => <BotCard key={bot.id} bot={bot} />)}
            </div>
          </section>
        )}

        {/* ── Order columns ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 flex-1 min-h-0">
          {/* PENDING */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between bg-orange-50 border-b border-orange-100 px-6 py-4">
              <h2 className="font-bold text-orange-700 uppercase tracking-wider" style={{ padding: '0.25rem 0.5rem' }}>
                Pending
              </h2>
              <span className="rounded-full bg-orange-200 text-orange-800 text-sm font-bold px-3 py-1" style={{ padding: '0.25rem 0.5rem' }}>
                {pending.length}
              </span>
            </div>
            <div className="p-5 space-y-3 flex-1 overflow-y-auto">
              {pending.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-300 text-sm">No pending orders</p>
                </div>
              ) : (
                pending.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    isProcessing={bots.some(b => b.orderId === order.id)}
                  />
                ))
              )}
            </div>
          </section>

          {/* COMPLETE */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between bg-green-50 border-b border-green-100 px-6 py-4">
              <h2 className="font-bold text-green-700 uppercase tracking-wider" style={{ padding: '0.25rem 0.5rem' }}>
                Complete
              </h2>
              <span className="rounded-full bg-green-200 text-green-800 text-sm font-bold px-3 py-1" style={{ padding: '0.25rem 0.5rem' }}>
                {completed.length}
              </span>
            </div>
            <div className="p-5 space-y-3 flex-1 overflow-y-auto">
              {completed.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-300 text-sm">No completed orders yet</p>
                </div>
              ) : (
                [...completed].reverse().map(order => (
                  <CompletedCard key={order.id} order={order} />
                ))
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
