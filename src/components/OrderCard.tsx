import type { Order } from '../core/types'

interface OrderCardProps {
  order: Order
  remainingMs?: number
  totalMs?: number
}

export function OrderCard({ order, remainingMs, totalMs }: OrderCardProps) {
  const isVip = order.type === 'VIP'
  const isProcessing =
    order.status === 'PROCESSING' && remainingMs != null && totalMs != null

  const secondsLeft = isProcessing ? Math.max(0, Math.ceil(remainingMs / 1000)) : 0
  const pct = isProcessing
    ? Math.max(0, Math.min(100, (remainingMs / totalMs) * 100))
    : 0

  return (
    <div
      className={`rounded-md border p-3 ${
        isVip ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm font-medium text-slate-700">
          #{order.id}
        </span>
        <span
          className={`rounded px-1.5 py-0.5 text-xs font-medium ${
            isVip
              ? 'bg-amber-100 text-amber-700'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          {isVip ? 'VIP' : 'Normal'}
        </span>
      </div>

      {isProcessing && (
        <div className="mt-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-slate-700 transition-[width] duration-200 ease-linear"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 text-right text-xs text-slate-500">{secondsLeft}s left</p>
        </div>
      )}
    </div>
  )
}
