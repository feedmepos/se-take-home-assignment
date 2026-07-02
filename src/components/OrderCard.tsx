import type { Order } from '../core/types'

interface OrderCardProps {
  order: Order
  /** When processing, ms remaining and the total, to render a countdown. */
  remainingMs?: number
  totalMs?: number
}

/** A single order tile. Shows the number, VIP/Normal badge, and — while being
 *  cooked — a shrinking progress bar with the seconds remaining. */
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
      className={`rounded-lg border p-3 shadow-sm ${
        isVip ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm font-semibold text-slate-700">
          #{order.id}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
            isVip ? 'bg-amber-400 text-amber-900' : 'bg-slate-200 text-slate-600'
          }`}
        >
          {isVip ? '★ VIP' : 'Normal'}
        </span>
      </div>

      {isProcessing && (
        <div className="mt-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-red-500 transition-[width] duration-200 ease-linear"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 text-right text-xs text-slate-500">{secondsLeft}s left</p>
        </div>
      )}
    </div>
  )
}
