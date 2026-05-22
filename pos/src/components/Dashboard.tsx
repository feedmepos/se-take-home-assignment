import { useEffect, useState, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/store/auth'
import { OrderCard } from './OrderCard'
import { BotDisplay } from './BotDisplay'
import { OfflineIndicator } from './OfflineIndicator'
import {
  LogOut,
  Activity,
  Cpu,
  ChevronDown,
  ChevronUp,
  Bell,
  Settings,
  Plus,
  Minus,
  Star,
  Trash2,
} from 'lucide-react'
import mcdLogo from '../assets/mcd_logo.png'
import { useMemo } from 'react'
import { Button } from './ui/button'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Separator } from './ui/separator'

interface DashboardOrder {
  id: string
  orderNumber: number
  type: 'NORMAL' | 'VIP'
  status: 'PENDING' | 'PROCESSING' | 'COMPLETE'
  botId: string | null
  createdAt: string | number
  processingStartedAt: string | number | null
  completedAt: string | number | null
}

interface DashboardBot {
  id: string
  status: 'IDLE' | 'PROCESSING' | 'DELETED'
  currentOrderId: string | null
}

export function Dashboard() {
  const navigate = useNavigate()
  const { state: authState, actions: authActions } = useAuthStore()
  const [isCreating, setIsCreating] = useState(false)
  const [botsCollapsed, setBotsCollapsed] = useState(true)
  const assigningRef = useRef<Set<string>>(new Set()) // Track bots being assigned
  const [now, setNow] = useState(() => Date.now())

  // Fetch orders
  const {
    data: ordersData,
    refetch: refetchOrders,
    isLoading: ordersLoading,
  } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const response = await fetch('/api/orders')
      if (!response.ok) throw new Error('Failed to fetch orders')
      return response.json()
    },
    refetchInterval: 2000,
  })

  // Fetch bots
  const {
    data: botsData,
    refetch: refetchBots,
    isLoading: botsLoading,
  } = useQuery({
    queryKey: ['bots'],
    queryFn: async () => {
      const response = await fetch('/api/bots')
      if (!response.ok) throw new Error('Failed to fetch bots')
      return response.json()
    },
    refetchInterval: 2000,
  })

  const orders = ordersData?.orders || []
  const bots = botsData?.bots || []

  // Group orders by status
  // Ensure PROCESSING orders never appear in pending column (defensive filtering)
  const pendingOrders = orders.filter(
    (o: DashboardOrder) => o.status === 'PENDING',
  )
  const processingOrders = orders.filter(
    (o: DashboardOrder) => o.status === 'PROCESSING',
  )
  // Filter completed orders to hide those older than 30 minutes
  const completeOrders = orders.filter((o: DashboardOrder) => {
    if (o.status !== 'COMPLETE') return false
    if (!o.completedAt) return true // Show if no completion time (shouldn't happen)

    const completedAtMs = new Date(o.completedAt).getTime()
    const thirtyMinutesMs = 30 * 60 * 1000
    const isOlderThan30Minutes = now - completedAtMs > thirtyMinutesMs

    return !isOlderThan30Minutes
  })

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Handle logout
  const handleLogout = () => {
    authActions.logout()
    navigate({ to: '/login' })
  }

  // Create order
  const createOrder = async (type?: 'NORMAL' | 'VIP') => {
    if (!authState.user) return

    // Determine order type based on user role if not explicitly provided
    const orderType = type ?? (authState.user.role === 'VIP' ? 'VIP' : 'NORMAL')

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: orderType,
          userId: authState.user.id,
        }),
      })

      if (!response.ok) throw new Error('Failed to create order')

      await refetchOrders()
    } catch (error) {
      console.error('Error creating order:', error)
    }
  }

  // Add bot
  const addBot = async () => {
    setIsCreating(true)
    try {
      const response = await fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) throw new Error('Failed to create bot')

      await response.json()

      await refetchBots()
    } catch (error) {
      console.error('Error creating bot:', error)
    } finally {
      setIsCreating(false)
    }
  }

  // Remove bot
  const removeBot = async () => {
    const activeBots = bots.filter((b: DashboardBot) => b.status !== 'DELETED')
    if (activeBots.length === 0) return

    const newestBot = activeBots[0]

    setIsCreating(true)
    try {
      // Delete bot via API (backend handles returning order to PENDING)
      const response = await fetch(`/api/bots/${newestBot.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to remove bot')

      await refetchBots()
      await refetchOrders()
    } catch (error) {
      console.error('Error removing bot:', error)
    } finally {
      setIsCreating(false)
    }
  }

  // Clear all orders (manager only)
  const clearOrders = async () => {
    if (authState.user?.role !== 'MANAGER') return

    setIsCreating(true)
    try {
      const response = await fetch('/api/orders/clear', {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to clear orders')

      await refetchOrders()
      await refetchBots()
    } catch (error) {
      console.error('Error clearing orders:', error)
    } finally {
      setIsCreating(false)
    }
  }

  // Auto-assign orders to idle bots
  useEffect(() => {
    const idleBots = bots.filter((b: DashboardBot) => b.status === 'IDLE')
    if (idleBots.length === 0 || pendingOrders.length === 0) return

    idleBots.forEach((bot: DashboardBot) => {
      if (assigningRef.current.has(bot.id)) return
      assigningRef.current.add(bot.id)

      const assignOrder = async () => {
        try {
          const claimResponse = await fetch(`/api/bots/${bot.id}/claim`, {
            method: 'POST',
          })

          if (!claimResponse.ok) {
            if (claimResponse.status !== 409) {
              const errorText = await claimResponse.text()
              throw new Error(`Failed to claim order: ${errorText}`)
            }
          }

          await refetchOrders()
          await refetchBots()
        } catch (error) {
          console.error('Error assigning order:', error)
        } finally {
          assigningRef.current.delete(bot.id)
        }
      }

      void assignOrder()
    })
  }, [bots, pendingOrders, refetchOrders, refetchBots])

  const botProgress = useMemo(() => {
    const progress = new Map<string, number>()
    bots.forEach((bot: DashboardBot) => {
      if (bot.status !== 'PROCESSING' || !bot.currentOrderId) return
      const order = orders.find(
        (o: DashboardOrder) => o.id === bot.currentOrderId,
      )
      if (!order?.processingStartedAt) return
      const startedAtMs = new Date(order.processingStartedAt).getTime()
      if (Number.isNaN(startedAtMs)) return
      const elapsedMs = Math.max(0, now - startedAtMs)
      const remainingMs = Math.max(0, 10000 - elapsedMs)
      progress.set(bot.id, remainingMs)
    })
    return progress
  }, [bots, orders, now])

  return (
    <div className="min-h-screen bg-mesh flex flex-col selection:bg-primary/20">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5 group cursor-default">
              <div className="w-10 h-10 rounded-md flex items-center justify-center shadow-lg shadow-primary/20 transition-transform group-hover:scale-110">
                <img
                  src={mcdLogo}
                  alt="MCD"
                  className="w-6 h-6 object-contain brightness-110 contrast-125"
                />
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-black tracking-tighter leading-none flex items-center gap-2"></h1>
                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-0.5">
                  Powered by FeedMe
                </span>
              </div>
            </div>

            <Separator orientation="vertical" className="h-8 bg-border/40" />

            <nav className="hidden md:flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-sm h-9 text-xs font-bold uppercase tracking-wider text-primary bg-primary/5"
              >
                Overview
                <div className="ml-2 w-1 h-1 rounded-full bg-primary" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-sm h-9 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-all hover:bg-muted/50"
              >
                Analytics
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-sm h-9 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-all hover:bg-muted/50"
              >
                Fleet Mgmt
              </Button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-9 glass rounded-md flex items-center gap-1 px-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <Bell className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-8 bg-border/40" />

            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-xs font-black tracking-tight">
                  {authState.user?.username}
                </span>
                <span className="text-[9px] font-bold text-primary uppercase tracking-widest opacity-80">
                  {authState.user?.role}
                </span>
              </div>
              <div className="w-9 h-9 rounded-md glass flex items-center justify-center p-0.5 border-primary/20">
                <div className="w-full h-full rounded-sm bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-primary-foreground font-black text-xs">
                  {authState.user?.username?.charAt(0).toUpperCase()}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="w-9 h-9 rounded-md hover:bg-destructive/10 hover:text-destructive group"
              >
                <LogOut className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-[1600px] mx-auto px-8 pt-10 pb-40">
          {/* Three Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Column Factory */}
            {[
              {
                title: 'PENDING',
                orders: pendingOrders,
                color: 'text-amber-500',
                dot: 'bg-amber-500',
                empty: 'System Idle',
              },
              {
                title: 'PROCESSING',
                orders: processingOrders,
                color: 'text-blue-500',
                dot: 'bg-blue-500',
                empty: 'No Active Tasks',
              },
              {
                title: 'DONE',
                orders: completeOrders,
                color: 'text-emerald-500',
                dot: 'bg-emerald-500',
                empty: 'History Empty',
              },
            ].map((col, idx) => (
              <div key={idx} className="flex flex-col gap-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full',
                        col.dot,
                        idx < 2 && 'animate-pulse',
                      )}
                    />
                    <h2
                      className={cn(
                        'text-xs font-black uppercase tracking-[0.3em]',
                        col.color,
                      )}
                    >
                      {col.title}
                    </h2>
                  </div>
                  <div className="px-2 py-0.5 rounded-sm bg-background/50 border border-border/50">
                    <span className="font-mono text-[10px] font-bold text-muted-foreground">
                      {col.orders.length}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-4 min-h-[500px]">
                  {ordersLoading ? (
                    Array(3)
                      .fill(0)
                      .map((_, i) => (
                        <div
                          key={i}
                          className="h-24 glass rounded-md animate-pulse"
                        />
                      ))
                  ) : col.orders.length === 0 ? (
                    <div className="flex-1 glass rounded-lg border-dashed border-border/40 flex flex-col items-center justify-center text-center p-8 grayscale opacity-50">
                      <div className="w-16 h-16 rounded-md bg-muted/20 flex items-center justify-center mb-4">
                        <Activity className="w-8 h-8 text-muted-foreground/30" />
                      </div>
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/40">
                        {col.empty}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {col.orders.map((order: DashboardOrder) => (
                        <OrderCard
                          key={order.id}
                          orderNumber={order.orderNumber}
                          type={order.type}
                          status={order.status}
                          botId={order.botId}
                          createdAt={order.createdAt}
                          processingStartedAt={order.processingStartedAt}
                          completedAt={order.completedAt}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Fixed Bottom Panel - Full Width */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] border-t border-border/40 bg-background/90 backdrop-blur-xl">
        {/* Order Controls Section */}
        <div className="w-full border-b border-border/20 bg-muted/10">
          <div className="px-8 py-4 flex items-center justify-center gap-8">
            {/* Order Controls */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">
                  Order
                </span>
                <div className="flex items-center gap-2">
                  {authState.user?.role === 'MANAGER' ? (
                    <>
                      <Button
                        onClick={() => createOrder('NORMAL')}
                        variant="default"
                        size="sm"
                        className="h-10 px-4 rounded-md gap-2 font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                        Order
                      </Button>

                      <Button
                        onClick={() => createOrder('VIP')}
                        variant="outline"
                        size="sm"
                        className="h-10 px-4 rounded-md gap-2 font-bold border-amber-500/30 text-amber-500 bg-amber-500/5 transition-all hover:bg-amber-500/10 hover:scale-105 active:scale-95"
                      >
                        <Star className="w-4 h-4 fill-amber-500" />
                        VIP Order
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => createOrder()}
                      variant="default"
                      size="sm"
                      className="h-10 px-4 rounded-md gap-2 font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      Create Order
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {authState.user?.role === 'MANAGER' && (
              <>
                <Separator orientation="vertical" className="h-10 bg-white/10" />

                {/* Bot Controls */}
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">
                      Fleet ({bots.length})
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={addBot}
                        disabled={isCreating}
                        variant="secondary"
                        size="sm"
                        className="h-10 px-4 rounded-md gap-2 font-bold bg-white/5 border border-white/10 transition-all hover:bg-white/10 hover:scale-105 active:scale-95"
                      >
                        <Plus className="w-4 h-4 text-blue-400" />
                        Deploy Bot
                      </Button>

                      {bots.length > 0 && (
                        <Button
                          onClick={removeBot}
                          disabled={isCreating}
                          variant="outline"
                          size="sm"
                          className="h-10 w-10 p-0 rounded-md border-destructive/20 text-destructive bg-destructive/5 transition-all hover:bg-destructive/10 hover:scale-105 active:scale-95"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <Separator orientation="vertical" className="h-10 bg-white/10" />

                {/* Clear All Orders */}
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">
                      Manage
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={clearOrders}
                        disabled={isCreating}
                        variant="outline"
                        size="sm"
                        className="h-10 px-4 rounded-md gap-2 font-bold border-destructive/30 text-destructive bg-destructive/5 transition-all hover:bg-destructive/10 hover:scale-105 active:scale-95"
                      >
                        <Trash2 className="w-4 h-4" />
                        Clear All Orders
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Cooking Bots Header */}
        <div
          className="flex items-center justify-between px-8 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => setBotsCollapsed(!botsCollapsed)}
        >
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-xs font-black text-foreground uppercase tracking-[0.3em]">
                Cooking bots
              </h3>
            </div>

            {/* Collapsed Summary */}
            {botsCollapsed && (
              <div className="flex items-center gap-4">
                {botsLoading ? (
                  <div className="h-4 w-24 animate-pulse bg-muted/30 rounded" />
                ) : bots.length === 0 ? (
                  <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                    No units deployed
                  </span>
                ) : (
                  <>
                    {bots
                      .filter((b: DashboardBot) => b.status === 'PROCESSING')
                      .map((bot: DashboardBot) => {
                        const currentOrder = bot.currentOrderId
                          ? orders.find(
                              (o: DashboardOrder) =>
                                o.id === bot.currentOrderId,
                            )
                          : null
                        return (
                          <div
                            key={bot.id}
                            className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-blue-500/10 border border-blue-500/20"
                          >
                            <span className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-[10px] font-mono font-bold text-blue-500">
                              #{currentOrder?.orderNumber ?? '?'}
                            </span>
                          </div>
                        )
                      })}
                    {bots.filter((b: DashboardBot) => b.status === 'IDLE')
                      .length > 0 && (
                      <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                        {
                          bots.filter((b: DashboardBot) => b.status === 'IDLE')
                            .length
                        }{' '}
                        idle
                      </span>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Stats */}
            <div className="flex items-center gap-2 glass px-3 py-1 rounded-md">
              <div className="flex items-center gap-1.5 px-2 border-r border-border/40">
                <span className="w-1 h-1 rounded-sm bg-emerald-500" />
                <span className="text-[9px] font-black uppercase text-muted-foreground">
                  {bots.filter((b: DashboardBot) => b.status === 'IDLE').length}{' '}
                  Standby
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2">
                <span className="w-1 h-1 rounded-sm bg-blue-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase text-blue-500">
                  {
                    bots.filter((b: DashboardBot) => b.status === 'PROCESSING')
                      .length
                  }{' '}
                  Engaged
                </span>
              </div>
            </div>

            {botsCollapsed ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Expanded Content */}
        {!botsCollapsed && (
          <div className="border-t border-border/20 bg-muted/20">
            <div className="max-w-[1600px] mx-auto px-8 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {botsLoading ? (
                  Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <div
                        key={i}
                        className="h-28 glass rounded-md animate-pulse"
                      />
                    ))
                ) : bots.length === 0 ? (
                  <div className="col-span-full h-32 glass rounded-lg border-dashed border-border/40 flex flex-col items-center justify-center text-center p-8 grayscale opacity-50">
                    <Cpu className="w-8 h-8 text-muted-foreground/30 mb-2" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                      No units deployed
                    </p>
                  </div>
                ) : (
                  bots.map((bot: DashboardBot) => {
                    const currentOrder = bot.currentOrderId
                      ? orders.find(
                          (o: DashboardOrder) => o.id === bot.currentOrderId,
                        )
                      : null
                    return (
                      <BotDisplay
                        key={bot.id}
                        botId={bot.id}
                        status={bot.status}
                        currentOrderId={bot.currentOrderId}
                        orderNumber={currentOrder?.orderNumber ?? null}
                        remainingMs={botProgress.get(bot.id)}
                      />
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <OfflineIndicator />
    </div>
  )
}
