import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { Clock, CheckCircle2, Loader2, Star, ChefHat, Cpu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDuration, getTimeSince } from '@/lib/utils'
import { useState, useEffect } from 'react'

interface OrderCardProps {
  orderNumber: number
  type: 'NORMAL' | 'VIP'
  status: 'PENDING' | 'PROCESSING' | 'COMPLETE'
  botId: string | null
  createdAt: string | number
  processingStartedAt?: string | number | null
  completedAt: string | number | null
  className?: string
}

// Cooking animation phases
const COOKING_ICONS = ['🔥', '🍳', '🧑‍🍳', '⏳', '🔥']

const statusConfig = {
  PENDING: {
    label: 'Pending',
    icon: Clock,
    color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    dot: 'bg-amber-500',
  },
  PROCESSING: {
    label: 'Processing',
    icon: Loader2,
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    dot: 'bg-blue-500',
    spin: true,
  },
  COMPLETE: {
    label: 'Complete',
    icon: CheckCircle2,
    color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
}

export function OrderCard({
  orderNumber,
  type,
  status,
  botId,
  createdAt,
  processingStartedAt,
  completedAt,
  className = '',
}: OrderCardProps) {
  const config = statusConfig[status]
  const StatusIcon = config.icon
  const isVIP = type === 'VIP'

  // Cooking animation state
  const [cookingIndex, setCookingIndex] = useState(0)

  // Animate cooking icon
  useEffect(() => {
    if (status !== 'PROCESSING') return
    const interval = setInterval(() => {
      setCookingIndex((prev) => (prev + 1) % COOKING_ICONS.length)
    }, 800)
    return () => clearInterval(interval)
  }, [status])

  // Calculate time info
  const startTime =
    status === 'PROCESSING' && processingStartedAt
      ? processingStartedAt
      : createdAt

  const [waitTime, setWaitTime] = useState(() => getTimeSince(startTime))

  // Update wait time every second
  useEffect(() => {
    if (status === 'COMPLETE') return
    // Immediate update to handle phase change
    setWaitTime(getTimeSince(startTime))
    const interval = setInterval(() => {
      setWaitTime(getTimeSince(startTime))
    }, 1000)
    return () => clearInterval(interval)
  }, [startTime, status])

  // Calculate duration for completed orders
  const duration =
    status === 'COMPLETE' && completedAt && createdAt
      ? formatDuration(
          new Date(completedAt).getTime() - new Date(createdAt).getTime(),
        )
      : null

  return (
    <Card
      className={cn(
        'group relative overflow-hidden border-border/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5',
        isVIP
          ? 'border-amber-500/30 bg-gradient-to-br from-amber-500/[0.08] to-transparent'
          : 'bg-card/40 backdrop-blur-md',
        className,
      )}
    >
      {isVIP && (
        <div className="absolute -right-6 -top-6 w-16 h-16 bg-amber-500/10 blur-2xl rounded-md transition-all group-hover:bg-amber-500/20" />
      )}

      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Order Reference
            </span>
            <div
              className={cn(
                'font-mono text-2xl font-black tracking-tighter',
                isVIP ? 'text-amber-500' : 'text-foreground',
              )}
            >
              #{String(orderNumber).padStart(4, '0')}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {isVIP && (
              <Badge
                variant="outline"
                className="bg-amber-500/10 text-amber-500 border-amber-500/20 px-1.5 py-0 text-[10px] font-black uppercase tracking-tighter"
              >
                <Star className="w-3 h-3 mr-1 fill-amber-500" />
                VIP
              </Badge>
            )}
            <Badge
              variant="outline"
              className={cn(
                'gap-1.5 font-bold text-[10px] uppercase tracking-wider py-1 border-none px-2',
                config.color,
              )}
            >
              <div
                className={cn(
                  'w-1.5 h-1.5 rounded-sm',
                  config.dot,
                  config.spin && 'animate-pulse',
                )}
              />
              <StatusIcon
                className={cn('w-3 h-3', config.spin && 'animate-spin')}
              />
              {config.label}
            </Badge>
          </div>
        </div>

        {/* Bottom Section: Bot indicator, cooking icon, time info */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
          {/* Left: Bot indicator + cooking icon */}
          <div className="flex items-center gap-2">
            {botId ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-blue-500/10 border border-blue-500/20">
                <Cpu className="w-3 h-3 text-blue-500 animate-pulse" />
                <span className="font-mono text-[9px] font-bold text-blue-500 uppercase">
                  {botId.slice(-4)}
                </span>
              </div>
            ) : (
              <div className="w-[1px] h-3" />
            )}

            {status === 'PROCESSING' && (
              <span className="text-lg" title="Cooking in progress">
                {COOKING_ICONS[cookingIndex]}
              </span>
            )}
          </div>

          {/* Right: Wait time or duration */}
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tighter">
            {status === 'COMPLETE' && duration ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span className="text-muted-foreground/60">Done in</span>
                <span className="text-emerald-500">{duration}</span>
              </>
            ) : (
              <>
                <Clock className="w-3 h-3 text-muted-foreground/60" />
                <span className="text-muted-foreground/60">
                  {status === 'PENDING' ? 'Waiting' : 'Elapsed'}
                </span>
                <span
                  className={cn(
                    status === 'PROCESSING'
                      ? 'text-blue-500'
                      : 'text-amber-500',
                  )}
                >
                  {waitTime}
                </span>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
