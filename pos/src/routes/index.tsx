import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuthStore, authStore } from '@/store/auth'

export const Route = createFileRoute('/')({
  component: IndexComponent,
})

function IndexComponent() {
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
    if (!isHydrated) return
    // Redirect to dashboard if authenticated, otherwise login
    if (authState.isAuthenticated) {
      router.navigate({ to: '/dashboard' })
    } else {
      router.navigate({ to: '/login' })
    }
  }, [authState.isAuthenticated, router, isHydrated])

  // Show nothing while redirecting
  return null
}
