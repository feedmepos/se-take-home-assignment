import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuthStore, authStore } from '@/store/auth'
import { Dashboard } from '@/components/Dashboard'

export const Route = createFileRoute('/dashboard')({
  component: DashboardComponent,
})

function DashboardComponent() {
  const router = useRouter()
  const { state: authState } = useAuthStore()
  const [isHydrated, setIsHydrated] = useState(false)

  // Wait for client-side hydration and sync auth store from localStorage
  useEffect(() => {
    // Force sync from localStorage to ensure auth state is loaded
    try {
      const saved = localStorage.getItem('auth-store-state')
      if (saved) {
        const parsed = JSON.parse(saved)
        // Only update if different (prevents infinite loop)
        if (parsed.isAuthenticated !== authStore.state.isAuthenticated) {
          authStore.setState(parsed)
        }
      }
    } catch (e) {
      console.error('Failed to load auth state:', e)
    }
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    // Only redirect after hydration
    if (!isHydrated) return

    // Redirect to login if not authenticated
    if (!authState.isAuthenticated) {
      router.navigate({ to: '/login' })
    }
  }, [authState.isAuthenticated, router, isHydrated])

  // Show loading while hydrating or if not authenticated
  if (!isHydrated || !authState.isAuthenticated) {
    return null
  }

  return <Dashboard />
}
