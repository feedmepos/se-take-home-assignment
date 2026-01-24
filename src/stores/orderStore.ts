import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Order {
  id: number
  isVip: boolean
  status: 'pending' | 'processing' | 'completed'
  processingBotId?: number
}

export interface Bot {
  id: number
  status: 'idle' | 'processing'
  currentOrderId?: number
  timer?: ReturnType<typeof setTimeout>
}

export const useOrderStore = defineStore('order', () => {
  // State
  const orders = ref<Order[]>([])
  const bots = ref<Bot[]>([])
  const nextOrderId = ref(1)
  const nextBotId = ref(1)

  // Getters
  const pendingOrders = computed(() => orders.value.filter((o) => o.status === 'pending'))

  const processingOrders = computed(() => orders.value.filter((o) => o.status === 'processing'))

  const completedOrders = computed(() => orders.value.filter((o) => o.status === 'completed'))

  const idleBots = computed(() => bots.value.filter((b) => b.status === 'idle'))

  // Actions
  function addOrder(isVip: boolean) {
    const newOrder: Order = {
      id: nextOrderId.value++,
      isVip,
      status: 'pending',
    }

    if (isVip) {
      // Find the position after all existing VIP orders
      const lastVipIndex = orders.value
        .map((o, i) => (o.isVip && o.status === 'pending' ? i : -1))
        .filter((i) => i !== -1)
        .pop()

      if (lastVipIndex !== undefined) {
        // Insert after the last VIP order in pending
        const pendingStartIndex = orders.value.findIndex((o) => o.status === 'pending')
        const insertIndex = pendingStartIndex + pendingOrders.value.filter((o) => o.isVip).length
        orders.value.splice(insertIndex, 0, newOrder)
      } else {
        // No VIP orders in pending, add at the start of pending orders
        const firstPendingIndex = orders.value.findIndex((o) => o.status === 'pending')
        if (firstPendingIndex === -1) {
          orders.value.push(newOrder)
        } else {
          orders.value.splice(firstPendingIndex, 0, newOrder)
        }
      }
    } else {
      // Normal order goes to the end
      orders.value.push(newOrder)
    }

    // Try to assign to an idle bot
    assignOrderToIdleBot()
  }

  function addBot() {
    const newBot: Bot = {
      id: nextBotId.value++,
      status: 'idle',
    }
    bots.value.push(newBot)

    // Immediately try to process pending orders
    assignOrderToIdleBot()
  }

  function removeBot() {
    if (bots.value.length === 0) return

    // Remove the newest bot (last one)
    const botToRemove = bots.value[bots.value.length - 1]

    // If bot is processing, clear timer and return order to pending
    if (botToRemove.status === 'processing' && botToRemove.currentOrderId) {
      if (botToRemove.timer) {
        clearTimeout(botToRemove.timer)
      }

      // Return the order to pending status
      const orderIndex = orders.value.findIndex((o) => o.id === botToRemove.currentOrderId)
      if (orderIndex !== -1) {
        const order = orders.value[orderIndex]
        order.status = 'pending'
        order.processingBotId = undefined

        // Move order back to pending queue with correct priority
        orders.value.splice(orderIndex, 1)

        if (order.isVip) {
          // Insert VIP order at the front of pending (after other VIPs)
          const firstNonVipPendingIndex = orders.value.findIndex(
            (o) => o.status === 'pending' && !o.isVip
          )
          if (firstNonVipPendingIndex === -1) {
            // No non-VIP pending, add at end of pending section
            const lastPendingIndex = orders.value
              .map((o, i) => (o.status === 'pending' ? i : -1))
              .filter((i) => i !== -1)
              .pop()
            if (lastPendingIndex !== undefined) {
              orders.value.splice(lastPendingIndex + 1, 0, order)
            } else {
              orders.value.unshift(order)
            }
          } else {
            orders.value.splice(firstNonVipPendingIndex, 0, order)
          }
        } else {
          // Normal order goes to end of pending
          orders.value.push(order)
        }
      }
    }

    bots.value.pop()
  }

  function assignOrderToIdleBot() {
    const idleBot = bots.value.find((b) => b.status === 'idle')
    const nextOrder = pendingOrders.value[0]

    if (idleBot && nextOrder) {
      processOrder(idleBot, nextOrder)
    }
  }

  function processOrder(bot: Bot, order: Order) {
    bot.status = 'processing'
    bot.currentOrderId = order.id
    order.status = 'processing'
    order.processingBotId = bot.id

    // Process for 10 seconds
    bot.timer = setTimeout(() => {
      completeOrder(bot, order)
    }, 10000)
  }

  function completeOrder(bot: Bot, order: Order) {
    order.status = 'completed'
    order.processingBotId = undefined
    bot.status = 'idle'
    bot.currentOrderId = undefined
    bot.timer = undefined

    // Try to process next order
    assignOrderToIdleBot()
  }

  return {
    orders,
    bots,
    pendingOrders,
    processingOrders,
    completedOrders,
    idleBots,
    addOrder,
    addBot,
    removeBot,
  }
})
