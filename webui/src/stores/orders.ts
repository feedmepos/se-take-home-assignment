import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Order, OrderStatus } from '../types'
import { getOrders, createNormalOrder, createVipOrder } from '../api'

/** 将后端返回的订单数据标准化为前端 Order 类型 */
function normalizeOrder(raw: Record<string, unknown>): Order {
  const botId = raw.bot_id
  return {
    id: String(raw.id ?? ''),
    type: (raw.type as Order['type']) ?? 'NORMAL',
    status: (raw.status as OrderStatus) ?? 'PENDING',
    bot_id: botId != null && botId !== 0 ? String(botId) : null,
    created_at: String(raw.created_at ?? ''),
    processing_at: raw.processing_at ? String(raw.processing_at) : null,
    completed_at: raw.completed_at ? String(raw.completed_at) : null,
  }
}

export const useOrdersStore = defineStore('orders', () => {
  /** 所有订单 */
  const orders = ref<Order[]>([])
  /** 加载中 */
  const loading = ref(false)

  /** 按状态筛选订单 */
  const pendingOrders = computed(() =>
    orders.value
      .filter((o) => o.status === 'PENDING')
      .sort((a, b) => {
        // VIP 优先
        if (a.type !== b.type) return a.type === 'VIP' ? -1 : 1
        // 同类型按创建时间排序
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }),
  )

  const processingOrders = computed(() =>
    orders.value
      .filter((o) => o.status === 'PROCESSING')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
  )

  const completeOrders = computed(() =>
    orders.value
      .filter((o) => o.status === 'COMPLETE')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
  )

  /** 从服务端拉取全部订单 */
  async function fetchOrders() {
    loading.value = true
    try {
      const res = await getOrders()
      if (res.success && res.data) {
        orders.value = (res.data as unknown as Record<string, unknown>[]).map(normalizeOrder)
      }
    } catch (e) {
      console.error('获取订单失败:', e)
    } finally {
      loading.value = false
    }
  }

  /** 新建普通订单 */
  async function addNormalOrder() {
    try {
      await createNormalOrder()
      // 不从 REST 响应添加订单，由 WebSocket 事件 order_created 驱动
    } catch (e) {
      console.error('创建普通订单失败:', e)
    }
  }

  /** 新建 VIP 订单 */
  async function addVipOrder() {
    try {
      await createVipOrder()
      // 不从 REST 响应添加订单，由 WebSocket 事件 order_created 驱动
    } catch (e) {
      console.error('创建 VIP 订单失败:', e)
    }
  }

  /** 更新或插入订单（来自 WebSocket 事件） */
  function upsertOrder(order: Order) {
    const idx = orders.value.findIndex((o) => o.id === order.id)
    if (idx >= 0) {
      orders.value[idx] = order
    } else {
      orders.value.push(order)
    }
  }

  /** 根据 ID 更新订单状态 */
  function updateOrderStatus(orderId: string, status: OrderStatus, botId?: string | null) {
    const order = orders.value.find((o) => o.id === orderId)
    if (order) {
      order.status = status
      if (botId !== undefined) {
        order.bot_id = botId
      }
    }
  }

  /** 清空所有订单 */
  function clearAll() {
    orders.value = []
  }

  return {
    orders,
    loading,
    pendingOrders,
    processingOrders,
    completeOrders,
    fetchOrders,
    addNormalOrder,
    addVipOrder,
    upsertOrder,
    updateOrderStatus,
    clearAll,
  }
})
