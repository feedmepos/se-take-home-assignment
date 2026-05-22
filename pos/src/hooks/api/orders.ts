import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Order types
export interface Order {
  id: string
  orderNumber: number
  type: 'NORMAL' | 'VIP'
  status: 'PENDING' | 'PROCESSING' | 'COMPLETE'
  userId: string | null
  botId: string | null
  createdAt: Date
  processingStartedAt: Date | null
  completedAt: Date | null
  updatedAt: Date
  deletedAt: Date | null
}

// Query keys
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...orderKeys.lists(), filters] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
}

// API functions
async function fetchOrders(): Promise<{ orders: Order[] }> {
  const response = await fetch('/api/orders')
  if (!response.ok) throw new Error('Failed to fetch orders')
  return response.json()
}

async function createOrder(type: 'NORMAL' | 'VIP', userId: string): Promise<{ order: Order; message: string }> {
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, userId }),
  })
  if (!response.ok) throw new Error('Failed to create order')
  return response.json()
}

async function updateOrder(
  id: string,
  updates: { status?: 'PENDING' | 'PROCESSING' | 'COMPLETE'; botId?: string | null }
): Promise<{ order: Order; message: string }> {
  const response = await fetch(`/api/orders/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!response.ok) throw new Error('Failed to update order')
  return response.json()
}

async function deleteOrder(id: string): Promise<{ message: string }> {
  const response = await fetch(`/api/orders/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) throw new Error('Failed to delete order')
  return response.json()
}

// Query hooks
export function useOrders() {
  return useQuery({
    queryKey: orderKeys.all,
    queryFn: fetchOrders,
    refetchInterval: 2000, // Poll every 2 seconds
  })
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: async () => {
      const response = await fetch(`/api/orders/${id}`)
      if (!response.ok) throw new Error('Failed to fetch order')
      return response.json()
    },
    enabled: !!id,
  })
}

// Mutation hooks
export function useCreateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ type, userId }: { type: 'NORMAL' | 'VIP'; userId: string }) =>
      createOrder(type, userId),
    onSuccess: () => {
      // Invalidate and refetch orders
      queryClient.invalidateQueries({ queryKey: orderKeys.all })
    },
  })
}

export function useUpdateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { status?: 'PENDING' | 'PROCESSING' | 'COMPLETE'; botId?: string | null } }) =>
      updateOrder(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all })
    },
  })
}

export function useDeleteOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all })
    },
  })
}
