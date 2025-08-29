import type Bot from '@/types/bot'
import { defineStore } from 'pinia'
import { useOrderStore } from './order'

export const useBotStore = defineStore('bot', {
  state: () => ({
    bots: [] as Bot[],
    nextBotId: 1,
  }),
  actions: {
    addBot() {
      const bot: Bot = {
        id: this.nextBotId++,
        status: 'IDLE',
      }
      this.bots.push(bot)
      this.assignOrderToBots()
    },
    removeBot() {
      const orderStore = useOrderStore()
      const latestBot = this.bots[this.bots.length - 1]
      if (latestBot && latestBot.status === 'PROCESSING') {
        const processingOrder = orderStore.orders.find((o) => o.id === latestBot.currentOrderId)
        if (processingOrder) {
          clearTimeout(latestBot.processingTimeout)
          processingOrder.status = 'PENDING'
          processingOrder.botId = undefined
        }
      }
      this.bots.pop()
      this.assignOrderToBots()
    },
    assignOrderToBots() {
      const orderStore = useOrderStore()
      const pendingOrders = orderStore.orders.filter((o) => o.status === 'PENDING')
      const bot = this.bots.findLast((b) => b.status === 'IDLE')
      // TODO: Improve assignment logic to consider VIP orders and bot availability
      if (bot && pendingOrders[0]) {
        bot.status = 'PROCESSING'
        bot.currentOrderId = pendingOrders[0].id
        pendingOrders[0].status = 'PROCESSING'
        pendingOrders[0].botId = bot.id
        bot.processingTimeout = setTimeout(() => {
          this.completeOrder(bot.id, pendingOrders[0].id)
        }, 10000)
      }
    },
    completeOrder(botId?: number, orderId?: number) {
      const orderStore = useOrderStore()
      const order = orderStore.orders.find((o) => o.id === orderId)
      const bot = this.bots.find((b) => b.id === botId)
      if (order && bot) {
        order.status = 'COMPLETED'
        order.botId = undefined
        bot.status = 'IDLE'
        bot.currentOrderId = undefined
        bot.processingTimeout = undefined
        this.assignOrderToBots()
      }
    },
  },
})
