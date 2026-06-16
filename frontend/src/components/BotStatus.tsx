import { useOrderContext } from '../hooks/useOrderContext'
import { BotCard } from './BotCard'

export function BotStatus() {
  const { state } = useOrderContext()
  if (state.bots.length === 0) return null

  return (
    <div className="px-4 py-3 border-b border-[#EDE8E1]">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">
        Active Bots
        <span className="ml-2 px-1.5 py-0.5 rounded-full bg-mcd-black text-white text-[9px]">
          {state.bots.length}
        </span>
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
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
