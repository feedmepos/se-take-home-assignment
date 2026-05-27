import { create } from 'zustand'
import {
  type Order, type Bot, type PlacedBy, type IDataPort,
  ORDER_TYPE, ORDER_STATUS, BOT_STATUS, roleToUserId, tick,
} from './domain'

interface KitchenState {
  port: IDataPort
  orders: Order[]
  bots: Bot[]

  addNormalOrder: (placedBy: PlacedBy) => Promise<void>
  addVipOrder: (placedBy: PlacedBy) => Promise<void>
  addBot: () => Promise<void>
  removeBot: () => Promise<void>
  tick: (now: number) => Promise<void>
}

function createKitchenStore(port: IDataPort) {
  return create<KitchenState>((set, get) => {
    async function addOrder(type: Order['type'], placedBy: PlacedBy) {
      const p = get().port
      await p.addOrder({
        id: await p.getNextOrderId(),
        type,
        status: ORDER_STATUS.PENDING,
        placedBy,
        userId: roleToUserId(placedBy),
        createdAt: Date.now(),
      })
      set({ orders: [...await p.getOrders()] })
    }

    return {
      port,
      orders: [],
      bots: [],

      addNormalOrder: (placedBy) => addOrder(ORDER_TYPE.NORMAL, placedBy),
      addVipOrder: (placedBy) => addOrder(ORDER_TYPE.VIP, placedBy),

      addBot: async () => {
        const p = get().port
        await p.addBot({
          id: await p.getNextBotId(),
          status: BOT_STATUS.IDLE,
          orderId: null,
          startedAt: null,
          createdAt: Date.now(),
        })
        const raw = await p.getOrders()
        const bots = await p.getBots()
        tick(raw, bots, Date.now())
        set({ orders: [...raw], bots: [...bots] })
      },

      removeBot: async () => {
        const p = get().port
        const bots = await p.getBots()
        if (bots.length === 0) return

        const orders = await p.getOrders()
        // 移除优先级：空闲 > 处理普通单 > 处理 VIP 单
        const target = [...bots].sort((a, b) => {
          const prio = (bot: Bot) => {
            if (bot.status !== BOT_STATUS.PROCESSING) return 0
            return orders.find((o) => o.id === bot.orderId)?.type === ORDER_TYPE.VIP ? 2 : 1
          }
          return prio(a) - prio(b)
        })[0]

        if (target.status === BOT_STATUS.PROCESSING && target.orderId !== null) {
          await p.updateOrder(target.orderId, { status: ORDER_STATUS.PENDING })
        }
        await p.removeBot(target.id)
        set({ orders: [...await p.getOrders()], bots: [...await p.getBots()] })
      },

      tick: async (now: number) => {
        const p = get().port
        const raw = await p.getOrders()
        const bots = await p.getBots()
        tick(raw, bots, now)
        set({ orders: [...raw], bots: [...bots] })
      },
    }
  })
}

export { createKitchenStore }
