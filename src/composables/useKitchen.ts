import { onUnmounted, ref } from 'vue'
import { OrderController } from '@/domain/order-controller'
import type { BotStats, KitchenSnapshot, Order, ProcessingOrderView } from '@/domain/types'

export function useKitchen() {
  const snapshot = ref<KitchenSnapshot>({
    orders: [],
    bots: [],
    completed: [],
  })

  const controller = new OrderController(() => {
    snapshot.value = controller.getSnapshot()
  })

  snapshot.value = controller.getSnapshot()

  onUnmounted(() => {
    controller.destroy()
  })

  return {
    snapshot,
    pendingOrders: (): Order[] => controller.getPendingOrders(),
    processingOrders: (): ProcessingOrderView[] => controller.getProcessingOrders(),
    botStats: (): BotStats => controller.getBotStats(),
    completedOrders: (): Order[] => controller.getCompletedOrders(),
    canRemoveBot: (): boolean => snapshot.value.bots.length > 0,
    addNormalOrder: () => controller.addNormalOrder(),
    addVipOrder: () => controller.addVipOrder(),
    addBot: () => controller.addBot(),
    removeBot: () => controller.removeBot(),
  }
}
