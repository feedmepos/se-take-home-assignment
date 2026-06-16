import type { Bot, Order } from '../reducer/types'

interface BotCardProps {
  bot: Bot
  processingOrder: Order | undefined
}

export function BotCard({ bot, processingOrder }: BotCardProps) {
  const isProcessing = bot.status === 'PROCESSING'

  return (
    <div className={`bg-white rounded-2xl px-3 py-2.5 shadow-sm flex items-center gap-2.5 min-w-[140px] border-l-4 transition-all ${isProcessing ? 'border-mcd-red' : 'border-gray-200'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm ${isProcessing ? 'bg-mcd-red' : 'bg-gray-100'}`}>
        <span className={isProcessing ? 'text-white' : 'text-gray-400'}>🤖</span>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-black text-mcd-black leading-none">Bot #{bot.id}</p>
        {isProcessing ? (
          <p className="text-[10px] font-semibold text-mcd-red mt-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-mcd-red animate-pulse inline-block" />
            Order #{processingOrder?.id}
          </p>
        ) : (
          <p className="text-[10px] text-gray-400 mt-0.5 font-medium">Idle</p>
        )}
      </div>
    </div>
  )
}
