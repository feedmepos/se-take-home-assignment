import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Button } from './ui/button'
import {
  Loader2,
  LayoutDashboard,
  Fingerprint,
  Keyboard,
  ShieldCheck,
} from 'lucide-react'
import mcdLogo from '../assets/mcd_logo.png'
import { useAuthStore } from '@/store/auth'
import type { User } from '@/db/schema'
import { cn } from '@/lib/utils'

interface LoginFormData {
  username: string
  password: string
}

// Demo credentials
const demoCredentials = [
  { username: 'normal_user', password: 'password123', role: 'NORMAL' },
  { username: 'vip_user', password: 'password123', role: 'VIP' },
  { username: 'manager', password: 'password123', role: 'MANAGER' },
]

export function LoginForm() {
  const navigate = useNavigate()
  const { actions: authActions } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<LoginFormData>({
    username: 'normal_user',
    password: 'password123',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      authActions.login(data.user as User)
      navigate({ to: '/dashboard' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const fillCredentials = (username: string, password: string) => {
    setFormData({ username, password })
    setError(null)
  }

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-6 selection:bg-primary/20">
      <div className="w-full max-w-md space-y-8">
        {/* Logo/Brand */}
        <div className="text-center space-y-4">
          <div className="inline-flex w-16 h-16 rounded-md bg-primary items-center justify-center shadow-2xl shadow-primary/30 mb-2">
            <LayoutDashboard className="w-8 h-8 text-primary-foreground" />
          </div>
          <div className="space-y-1">
            <h1 className="text-5xl font-black tracking-tighter flex items-center justify-center gap-4">
              FEED<span className="text-primary italic">ME</span>
              <img
                src={mcdLogo}
                alt="MCD"
                className="w-12 h-12 object-contain brightness-110 contrast-125"
              />
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground/60">
              Powered by FeedMe
            </p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="glass border-white/10 shadow-2xl rounded-lg overflow-hidden">
          <CardHeader className="pt-8 px-8 pb-4">
            <CardTitle className="text-2xl font-black tracking-tight">
              System Access
            </CardTitle>
            <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">
              Authentication Required
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username */}
              <div className="space-y-2">
                <Label
                  htmlFor="username"
                  className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                >
                  Network Identifier
                </Label>
                <div className="relative group">
                  <Fingerprint className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 transition-colors group-focus-within:text-primary" />
                  <Input
                    id="username"
                    type="text"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    placeholder="Identifier"
                    className="h-12 pl-11 rounded-md border-white/5 bg-background/50 backdrop-blur-sm focus:ring-primary/20 transition-all font-mono font-bold"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                >
                  Access Key
                </Label>
                <div className="relative group">
                  <Keyboard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 transition-colors group-focus-within:text-primary" />
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="••••••••"
                    className="h-12 pl-11 rounded-md border-white/5 bg-background/50 backdrop-blur-sm focus:ring-primary/20 transition-all font-mono font-bold"
                    required
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="p-4 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-[10px] font-black uppercase tracking-widest flex items-center gap-2 animate-shake">
                  <ShieldCheck className="w-4 h-4" />
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 rounded-md font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Initializing
                  </>
                ) : (
                  'Authorize'
                )}
              </Button>
            </form>

            {/* Demo Credentials */}
            <div className="mt-8 pt-6 border-t border-white/5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-4 text-center">
                Authorized Testing Profiles
              </p>
              <div className="grid grid-cols-1 gap-2">
                {demoCredentials.map((cred) => (
                  <button
                    key={cred.username}
                    type="button"
                    onClick={() =>
                      fillCredentials(cred.username, cred.password)
                    }
                    className="flex items-center justify-between p-3.5 rounded-md border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-primary/30 transition-all text-left group"
                  >
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary/80 group-hover:text-primary transition-colors">
                        {cred.role}
                      </span>
                      <span className="font-mono text-xs font-bold text-foreground/80 lowercase tracking-tighter">
                        {cred.username}
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-sm bg-background/50 flex items-center justify-center opacity-40 group-hover:opacity-100 transition-all group-hover:bg-primary/20">
                      <ShieldCheck className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/40">
            Industrial System Command • 2026
          </p>
        </div>
      </div>
    </div>
  )
}
