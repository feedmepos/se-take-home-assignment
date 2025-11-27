import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Order, OrderType, Bot } from './types'
import { Button } from './components/Button'
import { Card } from './components/Card'
import { BotCard } from './components/BotCard'
import { formatTime } from './utils/time'
import { PendingList } from './components/PendingList'
import { CompletedList } from './components/CompletedList'
import { Header } from './components/Header'

const PROCESS_MS = 10000; // time a bot spends actively processing an order

// Debug: Verify the constant is loaded correctly
console.log('🔧 App loaded - PROCESS_MS constant:', PROCESS_MS);

export default function App() {
  const [nextOrderId, setNextOrderId] = useState<number>(1)
  const [pending, setPending] = useState<Order[]>([])
  const [complete, setComplete] = useState<Order[]>([])
  const [bots, setBots] = useState<Bot[]>([])
  const [clock, setClock] = useState<number>(Date.now())
  const nextBotId = useRef(1)

  const enqueueOrder = (type: OrderType) => {
    console.log(`[${formatTime()}] Creating new ${type} order #${nextOrderId}`)
    setPending((prev: Order[]) => {
      const newOrder: Order = { id: nextOrderId, type, createdAt: Date.now() }
      setNextOrderId((id: number) => id + 1)
      const vip = prev.filter((o: Order) => o.type === 'VIP')
      const normal = prev.filter((o: Order) => o.type === 'Normal')
      const newPendingList = type === 'VIP' ? [...vip, newOrder, ...normal] : [...vip, ...normal, newOrder]
      console.log(`[${formatTime()}] Order queue updated. Total pending: ${newPendingList.length}`)
      return newPendingList
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
    console.log(`[${formatTime()}] startBotWork called for Bot ${botId}`)
    
    // Clear any existing timer for this bot first
    setBots((prev: Bot[]) => prev.map((b: Bot) => {
      if (b.id === botId && b.timer) {
        console.log(`[${formatTime()}] Clearing existing timer ${b.timer} for Bot ${botId}`)
        clearTimeout(b.timer)
        return { ...b, status: 'IDLE', currentOrder: undefined, timer: undefined }
      }
      return b.id === botId ? { ...b, status: 'IDLE', currentOrder: undefined } : b
    }))
    
    const order = pickNextOrder()
    if (!order) {
      console.log(`[${formatTime()}] Bot ${botId} IDLE (no pending orders)`)
      setBots((prev: Bot[]) => prev.map((b: Bot) => (b.id === botId ? { ...b, status: 'IDLE', currentOrder: undefined } : b)))
      return
    }
    order.startedAt = Date.now()
    console.log(`[${formatTime()}] Bot ${botId} START order #${order.id} (${order.type}) - will take ${PROCESS_MS}ms`)
    const workStartTime = Date.now()
    
    // Debug: Verify PROCESS_MS value
    console.log(`[${formatTime()}] PROCESS_MS constant value: ${PROCESS_MS}ms`)
    
    const timer = setTimeout(() => {
      const now = Date.now()
      const actualWorkTime = now - workStartTime
      order.completedAt = now
      const completedClone: Order = { ...order }
      setComplete((prev: Order[]) => [...prev, completedClone])
      console.log(`[${formatTime()}] Bot ${botId} COMPLETE order #${order.id} - actual work time: ${actualWorkTime}ms (expected: ${PROCESS_MS}ms)`)
      
      // Check if this is being called too early
      if (actualWorkTime < PROCESS_MS - 100) {
        console.error(`⚠️ TIMING ERROR: Bot ${botId} completed after ${actualWorkTime}ms but expected ${PROCESS_MS}ms`)
        console.error(`⚠️ Timer was set for: ${PROCESS_MS}ms`)
        console.error(`⚠️ Work started at: ${workStartTime}`)
        console.error(`⚠️ Work ended at: ${now}`)
      }
      
      // move bot to IDLE and start next work after a brief pause
      setBots((prev: Bot[]) => prev.map((b: Bot) => (b.id === botId ? { ...b, status: 'IDLE', currentOrder: undefined, timer: undefined } : b)))
      
      console.log(`[${formatTime()}] Bot ${botId} transitioning to IDLE, will check for next order in 1 second`)
      // Small pause between orders so you can see the transition
      setTimeout(() => {
        console.log(`[${formatTime()}] Bot ${botId} ready for next order`)
        startBotWork(botId)
      }, 1000)
    }, PROCESS_MS)
    
    console.log(`[${formatTime()}] setTimeout created with timer ID: ${timer}, delay: ${PROCESS_MS}ms`)
    setBots((prev: Bot[]) => prev.map((b: Bot) => (b.id === botId ? { ...b, status: 'WORKING', currentOrder: order, timer } : b)))
  }

  const addBot = () => {
    let newId = 1
    setBots((prev: Bot[]) => {
      newId = prev.length ? Math.max(...prev.map((b: Bot) => b.id)) + 1 : 1
      return [...prev, { id: newId, status: 'IDLE' }]
    })
    
    // Test setTimeout first
    console.log('🧪 Testing setTimeout with 10000ms delay...')
    const testStart = Date.now()
    setTimeout(() => {
      const testEnd = Date.now()
      const testDuration = testEnd - testStart
      console.log(`🧪 Test setTimeout completed after ${testDuration}ms (expected ~10000ms)`)
    }, 10000)
    
    setTimeout(() => startBotWork(newId), 100) // Small delay to avoid race conditions
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
    console.log(`[${formatTime()}] useEffect triggered - pending orders: ${pending.length}, bots: ${bots.length}`)
    if (pending.length === 0) return
    bots.forEach((b: Bot) => {
      console.log(`[${formatTime()}] Checking Bot ${b.id} - status: ${b.status}`)
      if (b.status === 'IDLE') {
        console.log(`[${formatTime()}] Bot ${b.id} is IDLE, starting work`)
        startBotWork(b.id)
      } else {
        console.log(`[${formatTime()}] Bot ${b.id} is ${b.status}, not starting work`)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending])

  useEffect(() => {
    // live update while any bot is working
    if (bots.some(b => b.status === 'WORKING')) {
      const interval = setInterval(() => setClock(Date.now()), 200)
      return () => clearInterval(interval)
    }
  }, [bots])

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

      <Card title="Bots" style={{ gridColumn: '1 / -1' }}>
        <div className="bot-list">
          {bots.map(b => {
            let progress = 0
            if (b.status === 'WORKING' && b.currentOrder?.startedAt) {
              progress = Math.min(100, ((clock - b.currentOrder.startedAt) / PROCESS_MS) * 100)
            }
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
