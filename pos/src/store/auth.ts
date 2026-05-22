import { Store } from '@tanstack/store'
import { useEffect, useState } from 'react'

// User role types
export type UserRole = 'NORMAL' | 'VIP' | 'MANAGER' | 'BOT'

// User type
export interface User {
  id: string
  username: string
  role: UserRole
}

// Auth store state
interface AuthStoreState {
  user: User | null
  isAuthenticated: boolean
}

// Initialize store from localStorage if available
function loadAuthStoreState(): AuthStoreState {
  if (typeof window === 'undefined') {
    return { user: null, isAuthenticated: false }
  }

  try {
    const saved = localStorage.getItem('auth-store-state')
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.error('Failed to load auth store state:', e)
  }

  return { user: null, isAuthenticated: false }
}

// Create auth store
export const authStore = new Store<AuthStoreState>({
  ...loadAuthStoreState(),
})

// Helper to save state to localStorage
function saveAuthState(state: AuthStoreState) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('auth-store-state', JSON.stringify(state))
    } catch (e) {
      console.error('Failed to save auth store state:', e)
    }
  }
}

// Auth store actions
export const authActions = {
  // Login user
  login: (user: User) => {
    const newState = { user, isAuthenticated: true }
    authStore.setState(newState)
    saveAuthState(newState)
  },

  // Logout user
  logout: () => {
    const newState = { user: null, isAuthenticated: false }
    authStore.setState(newState)
    saveAuthState(newState)
  },

  // Update user
  updateUser: (user: User) => {
    authStore.setState((prev) => {
      const newState = { ...prev, user }
      saveAuthState(newState)
      return newState
    })
  },
}

// React hook for auth store
export function useAuthStore() {
  // Use lazy initializer to get fresh state on first render
  const [state, setState] = useState<AuthStoreState>(() => authStore.state)

  useEffect(() => {
    // Sync with current store state on mount (handles localStorage hydration)
    setState(authStore.state)

    const unsubscribe = authStore.subscribe((newState) => setState(newState))
    return unsubscribe
  }, [])

  return {
    state,
    actions: authActions,
  }
}
