import { useEffect, useRef } from 'react'
import { ORDER_TYPE, ORDER_STATUS, ROLE, type Role, type Order, type Bot } from '../domain'
import { sortPending } from '../domain'
import { COOKING_TIME_MS, TICK_INTERVAL_MS } from '../config'
import { fmt } from '../helpers'

export default function CustomerView({
  role, myOrders, pending, bots, now,
  onOrder, onOrderLabel,
}: {
  role: Role; myOrders: Order[]; pending: Order[]; bots: Bot[]; now: number
  onOrder: () => void; onOrderLabel: string
}) {
  const isVip = role === ROLE.VIP_CUSTOMER

  const pendingOrders = myOrders.filter((o) => o.status === ORDER_STATUS.PENDING)
  const processingOrders = myOrders.filter((o) => o.status === ORDER_STATUS.PROCESSING)
  const completedOrders = myOrders
    .filter((o) => o.status === ORDER_STATUS.COMPLETED)
    .sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0))
  const activeOrders = [...pendingOrders, ...processingOrders]

  const completedBottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => { completedBottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [completedOrders.length])

  const allPendingSorted = sortPending(pending)
  function aheadCount(orderId: number) {
    const idx = allPendingSorted.findIndex((o) => o.id === orderId)
    return idx >= 1 ? idx : 0
  }

  const colClass = "flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden"
  const headerClass = "shrink-0 px-4 pt-3 pb-2 text-sm font-semibold border-b border-gray-100"
  const bodyClass = "flex-1 overflow-y-auto px-4 pb-3 space-y-3"

  return (
    <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-4 px-6 pb-4">
      <div className={colClass}>
        <div className={headerClass}>
          <span>📋 我的订单</span>
          <span className="text-gray-400 ml-1">({activeOrders.length})</span>
        </div>
        <div className={bodyClass}>
          <button
            onClick={onOrder}
            className={`w-full py-3 rounded-lg text-white font-bold text-base hover:brightness-110 active:scale-[0.98] transition cursor-pointer ${isVip ? 'bg-mcd-gold' : 'bg-mcd-red'}`}
          >
            {onOrderLabel}
          </button>

          {activeOrders.length === 0 && (
            <p className="text-gray-400 text-xs text-center pt-4">点击上方按钮下单 👆</p>
          )}

          {pendingOrders.map((o) => {
            const ahead = aheadCount(o.id)
            return (
              <div key={o.id} className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-lg">#{String(o.id).padStart(3, '0')}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${o.type === ORDER_TYPE.VIP ? 'bg-mcd-gold text-white' : 'bg-gray-200 text-gray-700'}`}>
                    {o.type === ORDER_TYPE.VIP ? 'VIP' : '普通'}
                  </span>
                </div>
                <div className="mt-1 text-xs text-gray-500">🕐 {fmt(o.createdAt)} 下单</div>
                {ahead > 0 && <div className="mt-1 text-sm text-gray-600">前面还有 <strong>{ahead}</strong> 单</div>}
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div className="h-2 rounded-full bg-gray-300" style={{ width: '100%' }} />
                </div>
              </div>
            )
          })}

          {processingOrders.map((o) => {
            const bot = bots.find(b => b.orderId === o.id)
            return (
              <div key={o.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-lg">#{String(o.id).padStart(3, '0')}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${o.type === ORDER_TYPE.VIP ? 'bg-mcd-gold text-white' : 'bg-gray-200 text-gray-700'}`}>
                    {o.type === ORDER_TYPE.VIP ? 'VIP' : '普通'}
                  </span>
                </div>
                <div className="mt-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-gray-500">🕐 {fmt(o.createdAt)} 下单</div>
                    {o.type === ORDER_TYPE.VIP && <span className="text-xs bg-mcd-gold text-white px-1.5 py-0.5 rounded font-medium">VIP</span>}
                  </div>
                  <div className="text-xs text-blue-600">🔧 正在出餐</div>
                </div>
                {bot?.startedAt && (
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-mcd-yellow h-2 rounded-full transition-[width]" style={{ width: `${Math.min(100, ((now - bot.startedAt) / COOKING_TIME_MS) * 100)}%`, transitionDuration: `${TICK_INTERVAL_MS}ms` }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className={colClass}>
        <div className={`${headerClass} text-green-700`}>
          <span>✅ 已完成</span>
          <span className="text-green-400 ml-1">({completedOrders.length})</span>
        </div>
        <div className={bodyClass}>
          {completedOrders.length === 0
            ? <p className="text-gray-400 text-xs text-center pt-6">暂无已完成订单</p>
            : completedOrders.map((o) => (
                <div key={o.id} className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-mono">#{String(o.id).padStart(3, '0')}</span>
                    <span className="text-green-600">✅ 已完成</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                    <div>🕐 {fmt(o.createdAt)} 下单</div>
                    {o.completedAt && <div>✅ {fmt(o.completedAt)} 完成</div>}
                  </div>
                </div>
              ))
          }
          <div ref={completedBottomRef} />
        </div>
      </div>
    </div>
  )
}
