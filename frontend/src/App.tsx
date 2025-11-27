import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Order, OrderType, Bot } from './types'
import { Button } from './components/Button'
import { Card } from './components/Card'
import { BotCard } from './components/BotCard'
import { formatTime } from './utils/time'
import { PendingList } from './components/PendingList'
import { CompletedList } from './components/CompletedList'
import { Header } from './components/Header'

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
    let newId = 1
    setBots((prev: Bot[]) => {
      newId = prev.length ? Math.max(...prev.map((b: Bot) => b.id)) + 1 : 1
      return [...prev, { id: newId, status: 'IDLE' }]
    })
    setTimeout(() => startBotWork(newId), 0)
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
      // If we are removing the last bot, reset ID sequence
      if (prev.length === 1) {
        nextBotId.current = 1
        return []
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
      <Header style={{ gridColumn: '1 / -1' }} title="McD Automated Cooking Bots" subtitle="Real-time order orchestration • VIP prioritization • Bot lifecycle simulation" />
      <section className="toolbar" style={{ gridColumn: '1 / -1' }}>
        <Button variant="normal" onClick={() => enqueueOrder('Normal')} icon={<span>🍔</span>}>
          New Normal Order
        </Button>
        <Button variant="vip" onClick={() => enqueueOrder('VIP')} icon={<span>⭐</span>}>
          New VIP Order
        </Button>
        <Button variant="add" onClick={addBot} icon={<span>🤖</span>}>
          + Bot
        </Button>
        <Button variant="remove" onClick={removeBot} disabled={bots.length === 0} icon={<span>🗑️</span>}>
          - Bot
        </Button>
      </section>

      <Card title="PENDING">
        <PendingList orders={pending} />
      </Card>

      <Card title="COMPLETE">
        <CompletedList orders={complete} />
      </Card>

      <Card title="Bots">
        <div className="bot-list">
          {bots.map(b => {
            const started = b.currentOrder?.startedAt ?? 0
            const progress = b.status === 'WORKING' && started
              ? Math.min(100, ((Date.now() - started) / 10_000) * 100)
              : 0
            return <BotCard key={b.id} bot={b} progress={progress} />
          })}
          {bots.length === 0 && <div className="no-bots">No bots. Add one with + Bot.</div>}
        </div>
      </Card>

      <footer style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#666' }}>
        <small>Time now: {formatTime()}</small>
      </footer>
    </div>
  )
}
