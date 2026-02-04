import { ref, onMounted, onUnmounted, computed } from 'vue'

const API_BASE = 'http://localhost:8080/api'

export function useOrderSystem() {
  const orders = ref([])
  const bots = ref([])
  const error = ref(null)
  
  // Computed lists
  const pendingOrders = computed(() => 
    orders.value.filter(o => o.status === 'PENDING')
  )
  
  const completeOrders = computed(() => 
    orders.value.filter(o => o.status === 'COMPLETE')
  )

  // Actions
  const fetchState = async () => {
    try {
      const res = await fetch(`${API_BASE}/state`)
      if (!res.ok) throw new Error('Failed to fetch state')
      const data = await res.json()
      orders.value = data.orders || []
      bots.value = data.bots || []
      error.value = null
    } catch (e) {
      error.value = e.message
      console.error(e)
    }
  }

  const addOrder = async (type) => {
    try {
      await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      })
      await fetchState()
    } catch (e) {
      console.error('Failed to add order:', e)
    }
  }

  const addBot = async () => {
    try {
      await fetch(`${API_BASE}/bots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add' })
      })
      await fetchState()
    } catch (e) {
      console.error('Failed to add bot:', e)
    }
  }

  const removeBot = async () => {
    try {
      await fetch(`${API_BASE}/bots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove' })
      })
      await fetchState()
    } catch (e) {
      console.error('Failed to remove bot:', e)
    }
  }

  // Polling
  let intervalId
  onMounted(() => {
    fetchState()
    intervalId = setInterval(fetchState, 1000) // Poll every second
  })

  onUnmounted(() => {
    clearInterval(intervalId)
  })

  return {
    orders,
    bots,
    pendingOrders,
    completeOrders,
    error,
    addOrder,
    addBot,
    removeBot
  }
}
