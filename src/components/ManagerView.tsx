import { useEffect, useRef } from 'react'
import { ORDER_TYPE, type Order, type Bot } from '../domain'
import ControlPanel from './ControlPanel'
import OrderCard from './OrderCard'
import BotCard from './BotCard'

export default function ManagerView({
  pending, completed, bots, now, orders,
  orderCount,
  onNormalOrder, onVipOrder, onAddBot, onRemoveBot,
}: {
  pending: Order[]; completed: Order[]; bots: Bot[]; now: number; orders: Order[]
  orderCount: number
  onNormalOrder: () => void; onVipOrder: () => void
  onAddBot: () => void; onRemoveBot: () => void
}) {
  const completedBottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => { completedBottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [completed.length])

  const colClass = "flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden"
  const headerClass = "shrink-0 px-4 pt-3 pb-2 text-sm font-semibold border-b border-gray-100"
  const bodyClass = "flex-1 overflow-y-auto px-4 pb-3 space-y-2"

  return (
    <>
      <ControlPanel
        orderCount={orderCount}
        botCount={bots.length}
        onNormalOrder={onNormalOrder}
        onVipOrder={onVipOrder}
        onAddBot={onAddBot}
        onRemoveBot={onRemoveBot}
      />
      <div className="flex-1 min-h-0 flex md:grid md:grid-cols-3 gap-4 px-6 pb-4 overflow-x-auto snap-x snap-mandatory scroll-smooth">
        <div className={`${colClass} min-w-[80vw] md:min-w-0 snap-center`}>
          <div className={headerClass}><span>⏳ 待处理</span><span className="text-gray-400 ml-1">({pending.length})</span></div>
          <div className={bodyClass}>
            {pending.length === 0
              ? <p className="text-gray-400 text-xs text-center pt-6">暂无待处理订单</p>
              : pending.map((o) => <OrderCard key={o.id} order={o} />)
            }
          </div>
        </div>
        <div className={`${colClass} min-w-[80vw] md:min-w-0 snap-center`}>
          <div className={headerClass}><span>🤖 机器人</span><span className="text-gray-400 ml-1">({bots.length})</span></div>
          <div className={bodyClass}>
            {bots.length === 0
              ? <p className="text-gray-400 text-xs text-center pt-6">暂未添加机器人</p>
              : bots.map((b) => {
                const order = orders.find((o) => o.id === b.orderId)
                return <BotCard key={b.id} bot={b} now={now} isVip={order?.type === ORDER_TYPE.VIP} />
              })
            }
          </div>
        </div>
        <div className={`${colClass} min-w-[80vw] md:min-w-0 snap-center`}>
          <div className={`${headerClass} text-green-700`}><span>✅ 已完成</span><span className="text-green-400 ml-1">({completed.length})</span></div>
          <div className={bodyClass}>
            {completed.length === 0
              ? <p className="text-gray-400 text-xs text-center pt-6">暂无已完成订单</p>
              : completed.map((o) => <OrderCard key={o.id} order={o} />)
            }
            <div ref={completedBottomRef} />
          </div>
        </div>
      </div>
    </>
  )
}
