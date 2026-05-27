export default function OrderCard({ order }) {
  const isVip = order.type === 'VIP'
  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
        isVip
          ? 'border-amber-400 bg-amber-50'
          : 'border-gray-300 bg-white'
      }`}
    >
      <span className="font-semibold text-gray-700">
        #{order.id}
        {isVip && (
          <span className="ml-1.5 rounded bg-amber-400 px-1.5 py-0.5 text-xs text-white">
            VIP
          </span>
        )}
      </span>
      <span className="text-xs text-gray-500">{order.type}</span>
    </div>
  )
}
