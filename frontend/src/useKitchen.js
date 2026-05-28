import { useState, useRef, useCallback } from 'react'

const COOK_MS  = 10_000
const MAX_BOTS = 5

const COLORS = ['#f472b6', '#60a5fa', '#a78bfa', '#fb923c', '#4ade80']
const FACES  = ['😤', '🤖', '👨‍🍳', '🧑‍🍳', '👩‍🍳']
const NAMES  = ['Boty', 'Beep', 'Chef-X', 'Zippy', 'Robo-G']

let _oc = 0  // order counter
let _bc = 0  // bot counter (for color index, pre-increment)

function makeOrder(type) {
  return { id: ++_oc, type, status: 'pending', botId: null, createdAt: Date.now(), startedAt: null, progress: 0 }
}
function makeBot() {
  const ci = _bc % MAX_BOTS  // colour index BEFORE increment
  return {
    id: ++_bc,
    color: COLORS[ci],
    face: FACES[ci],
    name: NAMES[ci],
    status: 'idle',
    orderId: null,
  }
}

export function useKitchen() {
  const [orders,    setOrders]    = useState([])  // pending + processing
  const [bots,      setBots]      = useState([])
  const [completed, setCompleted] = useState([])
  const [toasts,    setToasts]    = useState([])

  // Refs for stale-closure-free access in setTimeout/setInterval
  const ordersRef = useRef(orders)
  const botsRef   = useRef(bots)

  const syncOrders = (next) => { ordersRef.current = next; setOrders(next) }
  const syncBots   = (next) => { botsRef.current   = next; setBots(next) }

  // ── Toast ──────────────────────────────────────────────────────────────
  const addToast = useCallback((html, color = '#e2e8f0') => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, html, color }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000)
  }, [])

  // ── Core: pick an order for a bot ─────────────────────────────────────
  const pickOrder = useCallback((botId) => {
    const orders = ordersRef.current
    const bots   = botsRef.current
    const bot    = bots.find(b => b.id === botId)
    if (!bot || bot.status !== 'idle') return

    const order = orders.find(o => o.status === 'pending')
    if (!order) return

    const now = Date.now()
    const nextOrders = orders.map(o =>
      o.id === order.id ? { ...o, status: 'processing', botId, startedAt: now, progress: 0 } : o
    )
    const nextBots = bots.map(b =>
      b.id === botId ? { ...b, status: 'working', orderId: order.id } : b
    )
    syncOrders(nextOrders)
    syncBots(nextBots)

    // Progress ticker – updates once every 80ms via DOM like the original
    const startedAt = now
    const timerId = setInterval(() => {
      const progress = Math.min(100, (Date.now() - startedAt) / COOK_MS * 100)
      // Direct DOM update (no re-render) for the progress bar
      const fill = document.querySelector(`[data-oid="${order.id}"] .cpfill`)
      if (fill) fill.style.width = progress.toFixed(1) + '%'

      if (progress >= 100) {
        clearInterval(timerId)
        finishOrder(botId, order.id)
      }
    }, 80)
  }, []) // eslint-disable-line

  const finishOrder = useCallback((botId, orderId) => {
    const orders = ordersRef.current
    const bots   = botsRef.current
    const order  = orders.find(o => o.id === orderId)

    const nextOrders = orders.filter(o => o.id !== orderId)
    const nextBots   = bots.map(b => b.id === botId ? { ...b, status: 'idle', orderId: null } : b)
    syncOrders(nextOrders)
    syncBots(nextBots)

    if (order) {
      setCompleted(c => [{ ...order, status: 'completed' }, ...c])
      addToast(`✅ 订单 <b>#${order.id}</b> 完成！`, '#4ade80')
      doConfetti()
    }
    setTimeout(() => pickOrder(botId), 380)
  }, [addToast]) // eslint-disable-line

  // ── Public actions ─────────────────────────────────────────────────────
  const addNormalOrder = useCallback(() => {
    const o = makeOrder('nor')
    syncOrders([...ordersRef.current, o])
    addToast(`📋 新订单 <b>#${o.id}</b> 入队`, '#38bdf8')
    setTimeout(() => {
      const idle = botsRef.current.find(b => b.status === 'idle')
      if (idle) pickOrder(idle.id)
    }, 180)
  }, [addToast]) // eslint-disable-line

  const addVIPOrder = useCallback(() => {
    const o = makeOrder('vip')
    const q = ordersRef.current
    let lastVIP = -1
    q.forEach((x, i) => { if (x.type === 'vip') lastVIP = i })
    const next = [...q]
    next.splice(lastVIP + 1, 0, o)
    syncOrders(next)
    addToast(`👑 VIP 新订单 <b>#${o.id}</b> 入队`, '#f6c90e')
    flashVIP(o.id)
    setTimeout(() => {
      const idle = botsRef.current.find(b => b.status === 'idle')
      if (idle) pickOrder(idle.id)
    }, 180)
  }, [addToast]) // eslint-disable-line

  const addBot = useCallback(() => {
    if (botsRef.current.length >= MAX_BOTS) {
      addToast('⚠️ 最多 5 个机器人', '#f87171')
      return
    }
    const b = makeBot()
    syncBots([...botsRef.current, b])
    addToast(`🤖 <b>${b.name}</b> 入场！`, b.color)
    setTimeout(() => {
      if (ordersRef.current.find(o => o.status === 'pending')) pickOrder(b.id)
    }, 650)
  }, [addToast]) // eslint-disable-line

  const removeBot = useCallback(() => {
    const bots = botsRef.current
    if (bots.length === 0) { addToast('⚠️ 没有机器人', '#f87171'); return }

    const bot = bots[bots.length - 1]
    let nextOrders = ordersRef.current

    if (bot.orderId !== null) {
      // Return order to queue – re-sort VIPs before normals
      nextOrders = nextOrders.map(o =>
        o.id === bot.orderId
          ? { ...o, status: 'pending', botId: null, startedAt: null, progress: 0 }
          : o
      )
      nextOrders = [
        ...nextOrders.filter(o => o.type === 'vip'),
        ...nextOrders.filter(o => o.type === 'nor'),
      ]
      const returned = nextOrders.find(o => o.id === bot.orderId)
      if (returned) addToast(`↩️ 订单 <b>#${returned.id}</b> 退回待处理`, '#fbbf24')
    }

    addToast(`💨 <b>${bot.name}</b> 离开`, '#f87171')
    syncOrders(nextOrders)
    syncBots(bots.slice(0, -1))
  }, [addToast]) // eslint-disable-line

  return {
    orders, bots, completed, toasts,
    addNormalOrder, addVIPOrder, addBot, removeBot,
  }
}

// ── Global effects (fire-and-forget DOM, same as original) ─────────────────
function doConfetti() {
  const palette = ['#f472b6','#60a5fa','#a78bfa','#fb923c','#4ade80','#f6c90e','#38bdf8','#fff']
  const cx = window.innerWidth / 2, cy = window.innerHeight / 2
  for (let i = 0; i < 26; i++) {
    const bit = document.createElement('div')
    bit.className = 'cf'
    const ang  = Math.random() * Math.PI * 2
    const dist = 55 + Math.random() * 95
    bit.style.cssText = `
      left:${cx}px; top:${cy}px;
      background:${palette[i % palette.length]};
      border-radius:${Math.random() > .5 ? '50%' : '2px'};
      --tx:${Math.cos(ang) * dist}px;
      --ty:${Math.sin(ang) * dist}px;
      --r:${Math.random() * 720 - 360}deg;
      --d:${.65 + Math.random() * .45}s;
      --dl:${Math.random() * .14}s;
    `
    document.body.appendChild(bit)
    bit.addEventListener('animationend', () => bit.remove(), { once: true })
  }
}

export function flashVIP(id) {
  const b = document.createElement('div')
  b.className = 'vipbanner'
  b.textContent = `👑 VIP 订单 #${id} 优先入队！`
  document.body.appendChild(b)
  setTimeout(() => b.remove(), 1600)
}
