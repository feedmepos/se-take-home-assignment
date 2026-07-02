interface ControlsProps {
  onNewNormal: () => void
  onNewVip: () => void
  onAddBot: () => void
  onRemoveBot: () => void
  botCount: number
}

/** The action bar: create orders and scale the bot fleet up or down. */
export function Controls({
  onNewNormal,
  onNewVip,
  onAddBot,
  onRemoveBot,
  botCount,
}: ControlsProps) {
  const btn =
    'rounded-lg px-4 py-2 font-semibold text-white shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button className={`${btn} bg-slate-600 hover:bg-slate-700`} onClick={onNewNormal}>
        + New Normal Order
      </button>
      <button className={`${btn} bg-amber-500 hover:bg-amber-600`} onClick={onNewVip}>
        ★ New VIP Order
      </button>

      <span className="mx-1 h-6 w-px bg-slate-300" aria-hidden />

      <button className={`${btn} bg-green-600 hover:bg-green-700`} onClick={onAddBot}>
        + Bot
      </button>
      <button
        className={`${btn} bg-red-600 hover:bg-red-700`}
        onClick={onRemoveBot}
        disabled={botCount === 0}
      >
        − Bot
      </button>
    </div>
  )
}
