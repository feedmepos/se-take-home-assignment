import type Order from '@/types/order'
import { defineStore } from 'pinia'
import { useBotStore } from './bot'

export const useOrderStore = defineStore('order', {
  state: () => ({
    orders: [] as Order[],
    nextOrderId: 1,
  }),
  actions: {
    addNormalOrder() {
      const botStore = useBotStore()
      const newOrder: Order = {
        id: this.nextOrderId++,
        type: 'Normal',
        status: 'PENDING',
        isVIP: false,
      }
      this.orders.push(newOrder)
      botStore.assignOrderToBot(newOrder.id) // Example: Assign to bot with ID 1
    },
    addVIPOrder() {
      const botStore = useBotStore()
      const newOrder: Order = {
        id: this.nextOrderId++,
        type: 'VIP',
        status: 'PENDING',
        isVIP: true,
      }
      this.orders.push(newOrder)
      botStore.assignOrderToBot(newOrder.id) // Example: Assign to bot with ID 2
    },
  },
})
