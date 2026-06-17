import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Bot, Order, OrderType } from './types'
import { insertByPriority } from '@/utils/queue'

export const PROCESS_DURATION_MS = 3_000

export const useOrderStore = defineStore('order', () => {
  const orders = ref<Order[]>([])
  const pending = ref<Order[]>([])
  const bots = ref<Bot[]>([])
  const nextOrderId = ref(1)
  const nextBotId = ref(1)

  const completed = computed(() =>
    orders.value.filter(o => o.status === 'COMPLETE')
  )

  const ordersById = new Map<number, Order>()
  const timers = new Map<number, ReturnType<typeof setTimeout>>()

  function dispatch(): void {
    for (const bot of bots.value) {
      if (bot.status !== 'IDLE') continue
      const next = pending.value.shift()
      if (!next) return
      next.status = 'PROCESSING'
      next.botId = bot.id
      bot.status = 'BUSY'
      bot.orderId = next.id
      bot.startedAt = Date.now()
      const timerId = setTimeout(() => finishOrder(bot.id), PROCESS_DURATION_MS)
      timers.set(bot.id, timerId)
    }
  }

  function finishOrder(botId: number): void {
    const bot = bots.value.find(b => b.id === botId)
    if (!bot || bot.orderId == null) return
    const order = ordersById.get(bot.orderId)
    if (!order) return
    order.status = 'COMPLETE'
    order.completedAt = Date.now()
    bot.status = 'IDLE'
    bot.orderId = undefined
    bot.startedAt = undefined
    timers.delete(bot.id)
    dispatch()
  }

  function addOrder(type: OrderType): void {
    const order: Order = {
      id: nextOrderId.value++,
      type,
      status: 'PENDING',
      createdAt: Date.now()
    }
    orders.value.push(order)
    // 读回响应式代理:orders / pending / ordersById 必须共用同一引用,
    // 否则经 ordersById 改 status 会绕过 proxy,completed 不更新
    const tracked = orders.value[orders.value.length - 1]
    ordersById.set(tracked.id, tracked)
    insertByPriority(pending.value, tracked)
    dispatch()
  }

  function addNormal(): void {
    addOrder('NORMAL')
  }

  function addVip(): void {
    addOrder('VIP')
  }

  function addBot(): void {
    bots.value.push({ id: nextBotId.value++, status: 'IDLE' })
    dispatch()
  }

  function removeBot(): void {
    const bot = bots.value.pop()
    if (!bot) return
    if (bot.status === 'BUSY' && bot.orderId != null) {
      const timer = timers.get(bot.id)
      if (timer) clearTimeout(timer)
      timers.delete(bot.id)
      const order = ordersById.get(bot.orderId)
      if (order) {
        order.status = 'PENDING'
        order.botId = undefined
        insertByPriority(pending.value, order)
      }
      dispatch()
    }
  }

  return {
    orders,
    pending,
    bots,
    completed,
    addNormal,
    addVip,
    addBot,
    removeBot
  }
})
