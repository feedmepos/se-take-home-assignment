import { useOrderContext } from '../hooks/useOrderContext'
import { BotCard } from './BotCard'

export function BotStatus() {
  const { state } = useOrderContext()
  if (state.bots.length === 0) return null

  return (
    <div className="px-4 pb-3 border-b border-gray-100">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Bots</p>
      <div className="flex flex-wrap gap-2">
        {state.bots.map(bot => (
          <BotCard
            key={bot.id}
            bot={bot}
            processingOrder={state.orders.find(o => o.id === bot.processingOrderId)}
          />
        ))}
      </div>
    </div>
  )
}
