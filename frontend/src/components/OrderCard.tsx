import { useEffect, useRef, useState } from 'react'
import type { Order } from '../reducer/types'
import { CircularProgress } from './CircularProgress'

interface OrderCardProps {
  order: Order
}

export function OrderCard({ order }: OrderCardProps) {
  const [progress, setProgress] = useState(0)
  const [countdown, setCountdown] = useState(10)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (order.status === 'PROCESSING' && order.startedAt !== null) {
      const startedAt = order.startedAt
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startedAt
        setProgress(Math.min(elapsed / 10000, 1))
        setCountdown(Math.max(Math.ceil(10 - elapsed / 1000), 0))
      }, 100)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [order.status, order.startedAt])

  const isVip = order.type === 'VIP'

  if (order.status === 'COMPLETE') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border-l-4 border-[#22C55E] flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">Order</span>
            <span className="text-xl font-black text-[#27251F] leading-none">#{order.id}</span>
          </div>
          <div className="mt-1">
            {isVip ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFC72C] text-[#27251F]">
                👑 VIP
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500">
                Normal
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[#22C55E] text-lg">✓</span>
          <span className="text-[11px] font-bold text-[#22C55E]">Done</span>
        </div>
      </div>
    )
  }

  if (order.status === 'PROCESSING') {
    return (
      <div className="bg-white rounded-2xl shadow-md border-l-4 border-[#DA291C] flex items-center gap-3 px-4 py-3">
        <CircularProgress progress={progress} countdown={countdown} size={52} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">Order</span>
            <span className="text-xl font-black text-[#27251F] leading-none">#{order.id}</span>
          </div>
          <div className="mt-1">
            {isVip ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFC72C] text-[#27251F]">
                👑 VIP
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500">
                Normal
              </span>
            )}
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wide text-[#DA291C] shrink-0">Cooking</span>
      </div>
    )
  }

  // PENDING
  return (
    <div className="bg-white rounded-2xl shadow-sm border-l-4 border-[#FFC72C] flex items-center gap-3 px-4 py-3">
      <CircularProgress progress={0} countdown={10} size={52} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">Order</span>
          <span className="text-xl font-black text-[#27251F] leading-none">#{order.id}</span>
        </div>
        <div className="mt-1">
          {isVip ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFC72C] text-[#27251F]">
              👑 VIP
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500">
              Normal
            </span>
          )}
        </div>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 shrink-0">Queued</span>
    </div>
  )
}
