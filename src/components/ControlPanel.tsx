interface ControlPanelProps {
  orderCount: number
  botCount: number
  onNormalOrder: () => void
  onVipOrder: () => void
  onAddBot: () => void
  onRemoveBot: () => void
}

export default function ControlPanel({
  orderCount,
  botCount,
  onNormalOrder,
  onVipOrder,
  onAddBot,
  onRemoveBot,
}: ControlPanelProps) {
  return (
    <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-3">
      <div className="flex gap-2">
        <button
          onClick={onNormalOrder}
          className="bg-mcd-yellow text-black font-semibold px-4 py-2 rounded hover:brightness-110 active:scale-95 transition cursor-pointer"
        >
          ＋ 普通单
        </button>
        <button
          onClick={onVipOrder}
          className="bg-mcd-gold text-white font-semibold px-4 py-2 rounded hover:brightness-110 active:scale-95 transition cursor-pointer"
        >
          ★ VIP 单
        </button>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <span className="text-gray-600">📋 订单: <strong>{orderCount}</strong></span>
        <span className="text-gray-600">🤖 机器人: <strong>{botCount}</strong></span>
        <button
          onClick={onAddBot}
          className="bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 active:scale-95 transition cursor-pointer text-sm"
        >
          + Bot
        </button>
        <button
          onClick={onRemoveBot}
          disabled={botCount === 0}
          className="bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer text-sm"
        >
          – Bot
        </button>
      </div>
    </div>
  )
}
