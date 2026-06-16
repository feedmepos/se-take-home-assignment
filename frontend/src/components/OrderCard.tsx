import { useEffect, useRef, useState } from 'react'
import type { Order } from '../reducer/types'
import { CircularProgress } from './CircularProgress'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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
    } else {
      setProgress(0)
      setCountdown(10)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [order.status, order.startedAt])

  const isVip = order.type === 'VIP'

  if (order.status === 'COMPLETE') {
    return (
      <Card className="flex items-center gap-3 p-3 rounded-2xl shadow-sm border border-green-100">
        <div className="flex-1">
          <p className="font-bold text-sm text-gray-700">Order #{order.id}</p>
          <Badge
            className={isVip ? 'bg-amber-500 text-white mt-1' : 'mt-1'}
            variant={isVip ? 'default' : 'secondary'}
          >
            {isVip ? '👑 VIP' : 'Normal'}
          </Badge>
        </div>
        <span className="text-green-500 text-lg">✅</span>
      </Card>
    )
  }

  return (
    <Card className={`flex items-center gap-3 p-3 rounded-2xl shadow-md ${order.status === 'PROCESSING' ? 'border border-orange-200' : ''}`}>
      <CircularProgress
        progress={order.status === 'PROCESSING' ? progress : 0}
        countdown={order.status === 'PROCESSING' ? countdown : 10}
      />
      <div className="flex-1">
        <p className="font-bold text-sm text-gray-800">Order #{order.id}</p>
        <Badge
          className={isVip ? 'bg-amber-500 text-white mt-1' : 'mt-1'}
          variant={isVip ? 'default' : 'secondary'}
        >
          {isVip ? '👑 VIP' : 'Normal'}
        </Badge>
      </div>
      {order.status === 'PROCESSING' && (
        <span className="text-xs text-orange-400 font-medium">Processing</span>
      )}
    </Card>
  )
}
