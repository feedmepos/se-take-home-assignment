import BotCard from './BotCard'

export default function BotPanel({ bots, orders }) {
  const getOrder = (orderId) => orders.find((o) => o.id === orderId) || null

  return (
    <div className="flex flex-col rounded-xl bg-white p-4 shadow max-h-[60vh]">
      <h2 className="mb-3 text-lg font-bold text-gray-800">BOTS</h2>
      {bots.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No bots</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 overflow-y-auto">
          {bots.map((bot) => (
            <BotCard
              key={bot.id}
              bot={bot}
              order={bot.currentOrderId ? getOrder(bot.currentOrderId) : null}
            />
          ))}
        </div>
      )}
    </div>
  )
}
