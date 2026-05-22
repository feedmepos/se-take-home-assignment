import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Bot types
export interface Bot {
  id: string
  status: 'IDLE' | 'PROCESSING'
  currentOrderId: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

// Query keys
export const botKeys = {
  all: ['bots'] as const,
  lists: () => [...botKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...botKeys.lists(), filters] as const,
  details: () => [...botKeys.all, 'detail'] as const,
  detail: (id: string) => [...botKeys.details(), id] as const,
}

// API functions
async function fetchBots(): Promise<{ bots: Bot[] }> {
  const response = await fetch('/api/bots')
  if (!response.ok) throw new Error('Failed to fetch bots')
  return response.json()
}

async function createBot(): Promise<{ bot: Bot; message: string }> {
  const response = await fetch('/api/bots', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!response.ok) throw new Error('Failed to create bot')
  return response.json()
}

async function updateBot(
  id: string,
  updates: { status?: 'IDLE' | 'PROCESSING'; currentOrderId?: string | null }
): Promise<{ bot: Bot; message: string }> {
  const response = await fetch(`/api/bots/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!response.ok) throw new Error('Failed to update bot')
  return response.json()
}

async function deleteBot(id: string): Promise<{ message: string }> {
  const response = await fetch(`/api/bots/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) throw new Error('Failed to delete bot')
  return response.json()
}

// Query hooks
export function useBots() {
  return useQuery({
    queryKey: botKeys.all,
    queryFn: fetchBots,
    refetchInterval: 2000, // Poll every 2 seconds
  })
}

export function useBot(id: string) {
  return useQuery({
    queryKey: botKeys.detail(id),
    queryFn: async () => {
      const response = await fetch(`/api/bots/${id}`)
      if (!response.ok) throw new Error('Failed to fetch bot')
      return response.json()
    },
    enabled: !!id,
  })
}

// Mutation hooks
export function useCreateBot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => createBot(),
    onSuccess: () => {
      // Invalidate and refetch bots and orders
      queryClient.invalidateQueries({ queryKey: botKeys.all })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useUpdateBot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { status?: 'IDLE' | 'PROCESSING'; currentOrderId?: string | null } }) =>
      updateBot(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: botKeys.all })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useDeleteBot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteBot(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: botKeys.all })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
