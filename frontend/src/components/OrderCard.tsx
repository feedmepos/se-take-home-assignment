import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PROCESS_MS, type Order } from '@/hooks/useOrderController'

interface OrderCardProps {
  order: Order
  now: number
}

export function OrderCard({ order, now }: OrderCardProps) {
  const isVip = order.type === 'VIP'

  let remaining: number | null = null
  if (order.status === 'PROCESSING' && order.endsAt != null) {
    remaining = Math.max(0, Math.ceil((order.endsAt - now) / 1000))
  }

  return (
    <Card className={isVip ? 'border-amber-300' : ''}>
      <CardContent className="flex items-center justify-between gap-2 p-3">
        <span className="font-semibold">Order #{order.id}</span>
        <div className="flex items-center gap-2">
          {remaining !== null && (
            <span className="font-mono text-sm tabular-nums text-emerald-600">
              {remaining}s
            </span>
          )}
          <Badge variant={isVip ? 'vip' : 'normal'}>{order.type}</Badge>
        </div>
      </CardContent>
      {remaining !== null && (
        <div className="h-1 w-full overflow-hidden rounded-b-lg bg-slate-100">
          <div
            className="h-full bg-emerald-500 transition-[width] duration-300 ease-linear"
            style={{ width: `${(remaining / (PROCESS_MS / 1000)) * 100}%` }}
          />
        </div>
      )}
    </Card>
  )
}
