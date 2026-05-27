import { BOT_STATUS, ORDER_TYPE, type Bot } from '../domain'
import { COOKING_TIME_MS, TICK_INTERVAL_MS } from '../config'

export default function BotCard({ bot, now, isVip }: { bot: Bot; now: number; isVip?: boolean }) {
  const isProcessing = bot.status === BOT_STATUS.PROCESSING
  return (
    <div className={`p-3 rounded-lg border shadow-sm text-sm ${isProcessing ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center justify-between">
        <span className="font-mono font-bold">Bot #{bot.id}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${isProcessing ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
          {isProcessing ? '🟢 处理中' : '🟡 空闲'}
        </span>
      </div>
      {isProcessing && (
        <>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-600">订单 #{String(bot.orderId).padStart(3, '0')}</span>
            {isVip && <span className="text-xs bg-mcd-gold text-white px-1.5 py-0.5 rounded font-medium">VIP</span>}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div className="bg-mcd-yellow h-2 rounded-full transition-[width]" style={{ width: `${Math.min(100, ((now - bot.startedAt!) / COOKING_TIME_MS) * 100)}%`, transitionDuration: `${TICK_INTERVAL_MS}ms` }} />
          </div>
        </>
      )}
    </div>
  )
}
