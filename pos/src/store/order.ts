import { Store } from '@tanstack/store'
import { useEffect, useState } from 'react'

// Order types
export type OrderType = 'NORMAL' | 'VIP'
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE'

// Order interface
export interface Order {
  id: string
  orderNumber: number
  type: OrderType
  status: OrderStatus
  userId: string | null
  botId: string | null
  createdAt: Date
  processingStartedAt: Date | null
  completedAt: Date | null
  updatedAt: Date
  deletedAt: Date | null
}

// Order store state
interface OrderStoreState {
  orders: Order[]
  pendingOrders: Order[]
  processingOrders: Order[]
  completeOrders: Order[]
  isLoading: boolean
  error: string | null
}

// Initialize store from localStorage if available
function loadOrderStoreState(): OrderStoreState {
  if (typeof window === 'undefined') {
    return {
      orders: [],
      pendingOrders: [],
      processingOrders: [],
      completeOrders: [],
      isLoading: false,
      error: null,
    }
  }

  try {
    const saved = localStorage.getItem('order-store-state')
    if (saved) {
      const parsed = JSON.parse(saved)
      // Convert date strings back to Date objects
      const orders = (parsed.orders || []).map((o: any) => ({
        ...o,
        createdAt: new Date(o.createdAt),
        processingStartedAt: o.processingStartedAt
          ? new Date(o.processingStartedAt)
          : null,
        completedAt: o.completedAt ? new Date(o.completedAt) : null,
        updatedAt: new Date(o.updatedAt),
        deletedAt: o.deletedAt ? new Date(o.deletedAt) : null,
      }))
      return {
        orders,
        pendingOrders: orders.filter((o: Order) => o.status === 'PENDING'),
        processingOrders: orders.filter((o: Order) => o.status === 'PROCESSING'),
        completeOrders: orders.filter((o: Order) => o.status === 'COMPLETE'),
        isLoading: parsed.isLoading || false,
        error: parsed.error || null,
      }
    }
  } catch (e) {
    console.error('Failed to load order store state:', e)
  }

  return {
    orders: [],
    pendingOrders: [],
    processingOrders: [],
    completeOrders: [],
    isLoading: false,
    error: null,
  }
}

// Save state to localStorage
function saveOrderStoreState(state: OrderStoreState) {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(
      'order-store-state',
      JSON.stringify({
        orders: state.orders,
        isLoading: state.isLoading,
        error: state.error,
      })
    )
  } catch (e) {
    console.error('Failed to save order store state:', e)
  }
}

// Create order store
export const orderStore = new Store<OrderStoreState>({
  ...loadOrderStoreState(),
})

// Subscribe to state changes and persist to localStorage
if (typeof window !== 'undefined') {
  orderStore.subscribe((state) => {
    saveOrderStoreState(state)
  })
}

// Order store actions
export const orderActions = {
  // Set loading state
  setLoading: (isLoading: boolean) => {
    orderStore.setState((prev) => ({ ...prev, isLoading }))
  },

  // Set error state
  setError: (error: string | null) => {
    orderStore.setState((prev) => ({ ...prev, error }))
  },

  // Set all orders (from API)
  setOrders: (orders: Order[]) => {
    orderStore.setState((prev) => ({
      ...prev,
      orders,
      pendingOrders: orders.filter((o) => o.status === 'PENDING'),
      processingOrders: orders.filter((o) => o.status === 'PROCESSING'),
      completeOrders: orders.filter((o) => o.status === 'COMPLETE'),
      isLoading: false,
      error: null,
    }))
  },

  // Add a new order (optimistic update)
  addOrder: (order: Order) => {
    orderStore.setState((prev) => {
      const orders = [...prev.orders, order]
      return {
        ...prev,
        orders,
        pendingOrders: orders.filter((o) => o.status === 'PENDING'),
        processingOrders: orders.filter((o) => o.status === 'PROCESSING'),
        completeOrders: orders.filter((o) => o.status === 'COMPLETE'),
      }
    })
  },

  // Update an existing order
  updateOrder: (id: string, updates: Partial<Order>) => {
    orderStore.setState((prev) => {
      const orders = prev.orders.map((o) =>
        o.id === id ? { ...o, ...updates, updatedAt: new Date() } : o
      )
      return {
        ...prev,
        orders,
        pendingOrders: orders.filter((o) => o.status === 'PENDING'),
        processingOrders: orders.filter((o) => o.status === 'PROCESSING'),
        completeOrders: orders.filter((o) => o.status === 'COMPLETE'),
      }
    })
  },

  // Remove an order (soft delete)
  removeOrder: (id: string) => {
    orderStore.setState((prev) => {
      const orders = prev.orders.filter((o) => o.id !== id)
      return {
        ...prev,
        orders,
        pendingOrders: orders.filter((o) => o.status === 'PENDING'),
        processingOrders: orders.filter((o) => o.status === 'PROCESSING'),
        completeOrders: orders.filter((o) => o.status === 'COMPLETE'),
      }
    })
  },

  // Clear all orders
  clearOrders: () => {
    orderStore.setState((prev) => ({
      ...prev,
      orders: [],
      pendingOrders: [],
      processingOrders: [],
      completeOrders: [],
    }))
  },
}

// React hook for order store
export function useOrderStore() {
  const [state, setState] = useState<OrderStoreState>(() => ({
    orders: orderStore.state.orders,
    pendingOrders: orderStore.state.pendingOrders,
    processingOrders: orderStore.state.processingOrders,
    completeOrders: orderStore.state.completeOrders,
    isLoading: orderStore.state.isLoading,
    error: orderStore.state.error,
  }))

  useEffect(() => {
    const unsubscribe = orderStore.subscribe((newState) => {
      setState({
        orders: newState.orders,
        pendingOrders: newState.pendingOrders,
        processingOrders: newState.processingOrders,
        completeOrders: newState.completeOrders,
        isLoading: newState.isLoading,
        error: newState.error,
      })
    })
    return unsubscribe
  }, [])

  return {
    state,
    actions: orderActions,
  }
}
