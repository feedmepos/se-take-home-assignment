export default function ControlPanel({
  onAddNormal,
  onAddVip,
  onAddBot,
  onRemoveBot,
  botsCount,
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 shadow">
      <button
        onClick={onAddNormal}
        className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 transition-colors"
      >
        New Normal Order
      </button>
      <button
        onClick={onAddVip}
        className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
      >
        New VIP Order
      </button>
      <div className="ml-auto flex items-center gap-3">
        <button
          onClick={onAddBot}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
        >
          + Bot
        </button>
        <button
          onClick={onRemoveBot}
          disabled={botsCount === 0}
          className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          - Bot
        </button>
      </div>
    </div>
  )
}
