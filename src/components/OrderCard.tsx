import { ORDER_TYPE, ORDER_STATUS, type Order } from '../domain'
import { fmt } from '../helpers'

export default function OrderCard({ order }: { order: Order }) {
  const isVip = order.type === ORDER_TYPE.VIP
  return (
    <div className={`p-3 rounded-lg border-l-4 shadow-sm text-sm ${isVip ? 'border-mcd-gold bg-amber-50' : 'border-gray-300 bg-white'}`}>
      <div className="flex items-center justify-between">
        <span className="font-mono font-bold">#{String(order.id).padStart(3, '0')}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isVip ? 'bg-mcd-gold text-white' : 'bg-gray-200 text-gray-700'}`}>
          {isVip ? 'VIP' : '普通'}
        </span>
      </div>
      <div className="mt-1 space-y-0.5">
        <div className="text-xs text-gray-500">🕐 {fmt(order.createdAt)} 下单</div>
        {order.status === ORDER_STATUS.PROCESSING && <div className="text-xs text-blue-600">🔧 处理中</div>}
        {order.status === ORDER_STATUS.COMPLETED && order.completedAt && (
          <div className="text-xs text-green-600">✅ {fmt(order.completedAt)} 完成</div>
        )}
      </div>
    </div>
  )
}
