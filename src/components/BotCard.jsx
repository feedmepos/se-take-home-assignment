export default function BotCard({ bot, order }) {
  const isProcessing = bot.status === 'PROCESSING'
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-sm ${
        isProcessing
          ? 'border-blue-400 bg-blue-50'
          : 'border-gray-300 bg-white'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-700">Bot #{bot.id}</span>
        <span
          className={`rounded px-1.5 py-0.5 text-xs font-medium ${
            isProcessing
              ? 'bg-blue-500 text-white'
              : 'bg-green-500 text-white'
          }`}
        >
          {isProcessing ? 'PROCESSING' : 'IDLE'}
        </span>
      </div>
      {isProcessing && order && (
        <div className="mt-1 text-xs text-gray-500">
          Order #{order.id}
          {order.type === 'VIP' && (
            <span className="ml-1 rounded bg-amber-400 px-1 py-0.5 text-white">
              VIP
            </span>
          )}
        </div>
      )}
    </div>
  )
}
