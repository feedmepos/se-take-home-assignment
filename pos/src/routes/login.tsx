import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuthStore, authStore } from '@/store/auth'
import { LoginForm } from '@/components/LoginForm'

export const Route = createFileRoute('/login')({
  component: LoginComponent,
})

function LoginComponent() {
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
    // Redirect to dashboard if already authenticated
    if (authState.isAuthenticated) {
      router.navigate({ to: '/dashboard' })
    }
  }, [authState.isAuthenticated, router, isHydrated])

  // Show nothing while redirecting
  if (!isHydrated || authState.isAuthenticated) {
    return null
  }

  return <LoginForm />
}
