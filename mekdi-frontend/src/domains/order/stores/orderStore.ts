import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { OrderEntity, OrderQueue, BotEntity } from '../entities'
import { OrderProcessingService } from '../services'
import { OrderType, OrderStatus } from '../types'

export const useOrderStore = defineStore('order', () => {
  const orderQueue = new OrderQueue()
  
  const pendingOrders = ref<OrderEntity[]>([])
  const completeOrders = ref<OrderEntity[]>([])
  const bots = ref<BotEntity[]>([])

  const service = new OrderProcessingService(
    orderQueue,
    () => refreshState(),
    () => refreshBots()
  )

  function refreshState(): void {
    pendingOrders.value = orderQueue.getPendingOrders()
    completeOrders.value = orderQueue.getCompleteOrders()
  }

  function refreshBots(): void {
    bots.value = service.getBots()
  }

  function createNormalOrder(): OrderEntity {
    const order = service.createNormalOrder()
    refreshState()
    return order
  }

  function createVipOrder(): OrderEntity {
    const order = service.createVipOrder()
    refreshState()
    return order
  }

  function addBot(): BotEntity {
    const bot = service.addBot()
    refreshBots()
    refreshState()
    return bot
  }

  function removeBot(): BotEntity | null {
    const bot = service.removeBot()
    refreshBots()
    refreshState()
    return bot
  }

  const idleBotsCount = computed(() => bots.value.filter((b: BotEntity) => b.status === 'IDLE').length)
  const busyBotsCount = computed(() => bots.value.filter((b: BotEntity) => b.status === 'BUSY').length)

  refreshState()

  return {
    pendingOrders,
    completeOrders,
    bots,
    idleBotsCount,
    busyBotsCount,
    createNormalOrder,
    createVipOrder,
    addBot,
    removeBot,
    OrderType,
    OrderStatus
  }
})
