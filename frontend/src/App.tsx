import React, { useEffect, useMemo, useRef, useState } from 'react'

type OrderType = 'VIP' | 'Normal'
// Extend Order with processing timestamps
interface Order {
  id: number
  type: OrderType
  createdAt: number
  startedAt?: number
  completedAt?: number
}

interface Bot {
  id: number
  status: 'IDLE' | 'WORKING'
  currentOrder?: Order
  timer?: ReturnType<typeof setTimeout>
}

function formatTime(date = new Date()) {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export default function App() {
  const [nextOrderId, setNextOrderId] = useState<number>(1)
  const [pending, setPending] = useState<Order[]>([])
  const [complete, setComplete] = useState<Order[]>([])
  const [bots, setBots] = useState<Bot[]>([])
  const nextBotId = useRef(1)

  const enqueueOrder = (type: OrderType) => {
    setPending((prev: Order[]) => {
      const newOrder: Order = { id: nextOrderId, type, createdAt: Date.now() }
      setNextOrderId((id: number) => id + 1)
      const vip = prev.filter((o: Order) => o.type === 'VIP')
      const normal = prev.filter((o: Order) => o.type === 'Normal')
      return type === 'VIP' ? [...vip, newOrder, ...normal] : [...vip, ...normal, newOrder]
    })
  }

  const pickNextOrder = () => {
    let next: Order | undefined
    setPending((prev: Order[]) => {
      if (prev.length === 0) return prev
      next = prev[0]
      return prev.slice(1)
    })
    return next
  }

  const startBotWork = (botId: number) => {
    setBots((prev: Bot[]) => prev.map((b: Bot) => (b.id === botId ? { ...b, status: 'IDLE', currentOrder: undefined } : b)))
    const order = pickNextOrder()
    if (!order) {
      setBots((prev: Bot[]) => prev.map((b: Bot) => (b.id === botId ? { ...b, status: 'IDLE', currentOrder: undefined } : b)))
      return
    }
    // mark start time
    order.startedAt = Date.now()
    const timer = setTimeout(() => {
      // only complete if at least 10s elapsed (safeguard)
      const now = Date.now()
      if (order.startedAt && now - order.startedAt >= 10_000) {
        order.completedAt = now
      } else {
        // enforce exactly 10s
        order.completedAt = (order.startedAt || now) + 10_000
      }
      const completedClone: Order = { ...order }
      setComplete((prev: Order[]) => [...prev, completedClone])
      setBots((prev: Bot[]) => prev.map((b: Bot) => (b.id === botId ? { ...b, status: 'IDLE', currentOrder: undefined, timer: undefined } : b)))
      startBotWork(botId)
    }, 10_000)

    setBots((prev: Bot[]) => prev.map((b: Bot) => (b.id === botId ? { ...b, status: 'WORKING', currentOrder: order, timer } : b)))
  }

  const addBot = () => {
    const id = nextBotId.current++
    setBots((prev: Bot[]) => [...prev, { id, status: 'IDLE' }])
    setTimeout(() => startBotWork(id), 0)
  }

  const removeBot = () => {
    setBots((prev: Bot[]) => {
      if (prev.length === 0) return prev
      const newest = prev[prev.length - 1]
      if (newest.status === 'WORKING' && newest.currentOrder) {
        if (newest.timer) clearTimeout(newest.timer)
        // return the order to pending front preserving VIP priority
        const pendingOrder = { ...newest.currentOrder }
        delete pendingOrder.startedAt
        delete pendingOrder.completedAt
        setPending((p: Order[]) => {
          const vip = p.filter((o: Order) => o.type === 'VIP')
          const normal = p.filter((o: Order) => o.type === 'Normal')
          return pendingOrder.type === 'VIP' ? [pendingOrder, ...vip, ...normal] : [...vip, pendingOrder, ...normal]
        })
      }
      return prev.slice(0, -1)
    })
  }

  useEffect(() => {
    if (pending.length === 0) return
    bots.forEach((b: Bot) => {
      if (b.status === 'IDLE') startBotWork(b.id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending])

  const pendingVip = useMemo(() => pending.filter((o: Order) => o.type === 'VIP'), [pending])
  const pendingNormal = useMemo(() => pending.filter((o: Order) => o.type === 'Normal'), [pending])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: 24 }}>
      <header style={{ gridColumn: '1 / -1' }}>
        <h1 className="app-title">McD Automated Cooking Bots</h1>
        <p className="app-subtitle">Real-time order orchestration • VIP prioritization • Bot lifecycle simulation</p>
      </header>
      <section className="toolbar" style={{ gridColumn: '1 / -1' }}>
        <button className="btn btn-normal" onClick={() => enqueueOrder('Normal')}>
          <span className="icon">🍔</span>
          New Normal Order
        </button>
        <button className="btn btn-vip" onClick={() => enqueueOrder('VIP')}>
          <span className="icon">⭐</span>
          New VIP Order
        </button>
        <button className="btn btn-add" onClick={addBot}>
          <span className="icon">🤖</span>
          + Bot
        </button>
        <button className="btn btn-remove" onClick={removeBot} disabled={bots.length === 0}>
          <span className="icon">🗑️</span>
          - Bot
        </button>
      </section>

      <section style={{ background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2>PENDING</h2>
        {pending.length > 0 ? (
          <ul>
            {pending.map(o => (
              <li key={o.id}>
                <span className={`badge ${o.type === 'VIP' ? 'badge-vip' : 'badge-normal'}`}>{o.type}</span>
                {' '}#{o.id}
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">No pending orders</p>
        )}
      </section>

      <section style={{ background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2>COMPLETE</h2>
        {complete.length > 0 ? (
          <ul>
            {complete.map(o => (
              <li key={o.id}>#{o.id} {o.type} - {o.completedAt ? formatTime(new Date(o.completedAt)) : formatTime()}</li>
            ))}
          </ul>
        ) : (
          <p className="empty">No completed orders yet</p>
        )}
      </section>

      <section style={{ gridColumn: '1 / -1', background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2>Bots</h2>
        <div className="bot-list">
          {bots.map(b => {
            const started = b.currentOrder?.startedAt ?? 0
            const progress = b.status === 'WORKING' && started
              ? Math.min(100, ((Date.now() - started) / 10_000) * 100)
              : 0
            return (
              <div key={b.id} className={`bot-card ${b.status === 'WORKING' ? 'working' : ''}`}>
                <div className="top-row">
                  <div className="bot-id">🤖 Bot #{b.id}</div>
                  <span className={`chip ${b.status === 'WORKING' ? 'chip-working' : 'chip-idle'}`}>{b.status}</span>
                </div>
                <div className="order-line">Order: {b.currentOrder ? `#${b.currentOrder.id}` : '-'}</div>
                <div className="progress" aria-hidden={b.status !== 'WORKING'}>
                  <div className="bar" style={{ width: `${progress}%` }} />
                </div>
                {b.currentOrder && (
                  <div style={{ fontSize: 12, opacity: .8, marginTop: 6 }}>
                    Elapsed: {((Date.now() - (b.currentOrder.startedAt || Date.now())) / 1000).toFixed(1)}s / 10s
                  </div>
                )}
              </div>
            )
          })}
          {bots.length === 0 && <div className="no-bots">No bots. Add one with + Bot.</div>}
        </div>
      </section>

      <footer style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#666' }}>
        <small>Time now: {formatTime()}</small>
      </footer>
    </div>
  )
}
