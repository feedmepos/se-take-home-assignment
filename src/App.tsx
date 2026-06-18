import { useEffect, useMemo, useReducer, useState } from 'react'
import {
  BotIcon,
  Clock3,
  Crown,
  Minus,
  Plus,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  Timer,
  User,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Bot,
  CompletedOrder,
  Order,
  PROCESSING_MS,
  createInitialState,
  getPendingOrders,
  getProcessingOrders,
  orderControllerReducer,
} from '@/domain/orderController'
import { cn } from '@/lib/utils'

function App() {
  const [state, dispatch] = useReducer(
    orderControllerReducer,
    undefined,
    createInitialState,
  )
  const [now, setNow] = useState(() => Date.now())

  const pendingOrders = useMemo(() => getPendingOrders(state), [state])
  const processingOrders = useMemo(() => getProcessingOrders(state), [state])
  const activeBots = state.bots.filter((bot) => bot.processing).length
  const idleBots = state.bots.length - activeBots

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const timers = state.bots.flatMap((bot) => {
      if (!bot.processing) {
        return []
      }

      const delay = Math.max(0, bot.processing.completesAt - Date.now())
      const timer = window.setTimeout(() => {
        dispatch({
          type: 'complete-bot-order',
          botId: bot.id,
          completesAt: bot.processing!.completesAt,
          now: Date.now(),
        })
      }, delay)

      return [timer]
    })

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [state.bots])

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b bg-zinc-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-1 text-sm text-zinc-200">
                <Sparkles className="h-4 w-4 text-yellow-300" />
                Frontend prototype
              </div>
              <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">
                McDonald's Order Controller
              </h1>
              <p className="mt-3 text-sm leading-6 text-zinc-300 sm:text-base">
                Manage normal and VIP orders, scale cooking bots, and watch each
                bot finish one order every 10 seconds.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Button
                className="bg-yellow-400 text-zinc-950 hover:bg-yellow-300"
                onClick={() =>
                  dispatch({ type: 'add-order', kind: 'normal', now: Date.now() })
                }
              >
                <User className="h-4 w-4" />
                New Normal Order
              </Button>
              <Button
                className="bg-red-600 text-white hover:bg-red-500"
                onClick={() =>
                  dispatch({ type: 'add-order', kind: 'vip', now: Date.now() })
                }
              >
                <Crown className="h-4 w-4" />
                New VIP Order
              </Button>
              <Button
                variant="secondary"
                aria-label="Add bot"
                onClick={() => dispatch({ type: 'add-bot', now: Date.now() })}
              >
                <Plus className="h-4 w-4" />
                Bot
              </Button>
              <Button
                variant="outline"
                aria-label="Remove newest bot"
                className="border-white/25 bg-transparent text-white hover:bg-white hover:text-zinc-950"
                disabled={state.bots.length === 0}
                onClick={() => dispatch({ type: 'remove-newest-bot' })}
              >
                <Minus className="h-4 w-4" />
                Bot
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Pending" value={pendingOrders.length} />
            <MetricCard label="Processing" value={processingOrders.length} />
            <MetricCard label="Complete" value={state.completedOrders.length} />
            <MetricCard label="Bots" value={state.bots.length} detail={`${activeBots} active, ${idleBots} idle`} />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[1fr_1fr_1fr] lg:px-8">
        <OrderColumn
          title="Pending"
          description="VIP queue is shown before normal queue."
          icon={<Clock3 className="h-4 w-4" />}
          empty="No pending orders"
          orders={pendingOrders}
        />
        <ProcessingColumn bots={state.bots} now={now} />
        <CompleteColumn orders={state.completedOrders} />
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <Card className="border-dashed">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <div>
              <CardTitle>Queue Rule</CardTitle>
              <CardDescription>
                Canceled orders return to their own queue by increasing order ID.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dispatch({ type: 'reset' })}
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </CardHeader>
        </Card>
      </section>
    </main>
  )
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string
  value: number
  detail?: string
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/10 px-4 py-3">
      <div className="text-sm text-zinc-300">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold">{value}</span>
        {detail ? <span className="text-xs text-zinc-300">{detail}</span> : null}
      </div>
    </div>
  )
}

function OrderColumn({
  title,
  description,
  icon,
  orders,
  empty,
}: {
  title: string
  description: string
  icon: React.ReactNode
  orders: Order[]
  empty: string
}) {
  return (
    <Card
      className="min-h-[420px] shadow-panel"
      role="region"
      aria-label={`${title} orders`}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <EmptyState label={empty} />
        ) : (
          <div className="space-y-2">
            {orders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ProcessingColumn({ bots, now }: { bots: Bot[]; now: number }) {
  return (
    <Card
      className="min-h-[420px] shadow-panel"
      role="region"
      aria-label="Cooking bots"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BotIcon className="h-4 w-4" />
          Cooking Bots
        </CardTitle>
        <CardDescription>Each bot handles one order at a time.</CardDescription>
      </CardHeader>
      <CardContent>
        {bots.length === 0 ? (
          <EmptyState label="No bots available" />
        ) : (
          <div className="space-y-2">
            {bots.map((bot) => (
              <BotRow key={bot.id} bot={bot} now={now} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CompleteColumn({ orders }: { orders: CompletedOrder[] }) {
  return (
    <Card
      className="min-h-[420px] shadow-panel"
      role="region"
      aria-label="Complete orders"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="h-4 w-4" />
          Complete
        </CardTitle>
        <CardDescription>Finished orders stay here for this session.</CardDescription>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <EmptyState label="No completed orders" />
        ) : (
          <div className="space-y-2">
            {orders.map((order) => (
              <OrderRow key={order.id} order={order} completedAt={order.completedAt} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function OrderRow({
  order,
  completedAt,
}: {
  order: Order
  completedAt?: number
}) {
  const isVip = order.kind === 'vip'

  return (
    <div className="flex min-h-16 items-center justify-between gap-3 rounded-lg border bg-white p-3">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-md',
            isVip ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700',
          )}
        >
          {isVip ? <Crown className="h-5 w-5" /> : <User className="h-5 w-5" />}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">Order #{order.id}</div>
          <div className="text-xs text-muted-foreground">
            {isVip ? 'VIP member' : 'Normal customer'}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge variant={isVip ? 'destructive' : 'warning'}>
          {isVip ? 'VIP' : 'Normal'}
        </Badge>
        {completedAt ? (
          <span className="text-xs text-muted-foreground">
            {formatTime(completedAt)}
          </span>
        ) : null}
      </div>
    </div>
  )
}

function BotRow({ bot, now }: { bot: Bot; now: number }) {
  const remainingMs = bot.processing
    ? clamp(bot.processing.completesAt - now, 0, PROCESSING_MS)
    : 0
  const progress = bot.processing
    ? clamp(((PROCESSING_MS - remainingMs) / PROCESSING_MS) * 100, 0, 100)
    : 0

  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Bot #{bot.id}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {bot.processing
              ? `Processing order #${bot.processing.order.id}`
              : 'Waiting for pending orders'}
          </div>
        </div>
        <Badge variant={bot.processing ? 'success' : 'secondary'}>
          {bot.processing ? 'Active' : 'Idle'}
        </Badge>
      </div>

      {bot.processing ? (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Timer className="h-3.5 w-3.5" />
              {Math.ceil(remainingMs / 1000)}s left
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-52 items-center justify-center rounded-lg border border-dashed bg-muted/30 px-4 text-center text-sm text-muted-foreground">
      {label}
    </div>
  )
}

function formatTime(value: number) {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(value)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export default App
