import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'

// Auth types
export interface LoginRequest {
  username: string
  password: string
}

export interface User {
  id: string
  username: string
  role: 'NORMAL' | 'VIP' | 'MANAGER' | 'BOT'
}

export interface LoginResponse {
  user: User
  message: string
}

// Query keys
export const authKeys = {
  all: ['auth'] as const,
  user: () => [...authKeys.all, 'user'] as const,
}

// API functions
async function loginApi(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Login failed')
  }
  return response.json()
}

async function logoutApi(): Promise<{ message: string }> {
  // For this demo, logout is handled client-side
  // In a real app, this would call an API endpoint
  return { message: 'Logged out successfully' }
}

// Mutation hooks
export function useLogin() {
  const queryClient = useQueryClient()
  const { actions: authActions } = useAuthStore()

  return useMutation({
    mutationFn: (credentials: LoginRequest) => loginApi(credentials),
    onSuccess: (data) => {
      // Update auth store with logged in user
      authActions.login(data.user)

      // Invalidate related queries
      queryClient.invalidateQueries()
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  const { actions: authActions } = useAuthStore()

  return useMutation({
    mutationFn: () => logoutApi(),
    onSuccess: () => {
      // Clear auth store
      authActions.logout()

      // Clear all queries
      queryClient.clear()
    },
  })
}
