import type Order from '@/types/order'
import { defineStore } from 'pinia'
import { useBotStore } from './bot'

export const useOrderStore = defineStore('order', {
  state: () => ({
    orders: [] as Order[],
    nextOrderId: 1,
  }),
  actions: {
    addOrder(type: string) {
      const botStore = useBotStore()
      const newOrder: Order = {
        id: this.nextOrderId++,
        type: type,
        status: 'PENDING',
        isVIP: type === 'VIP',
      }
      this.orders.push(newOrder)
      botStore.assignOrderToBots()
    },
  },
})
