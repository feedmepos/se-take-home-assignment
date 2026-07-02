interface ControlsProps {
  onNewNormal: () => void
  onNewVip: () => void
  onAddBot: () => void
  onRemoveBot: () => void
  botCount: number
}

export function Controls({
  onNewNormal,
  onNewVip,
  onAddBot,
  onRemoveBot,
  botCount,
}: ControlsProps) {
  const base =
    'rounded-md px-3.5 py-2 text-sm font-medium shadow-sm transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40'
  const secondary = `${base} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`
  const primary = `${base} bg-slate-900 text-white hover:bg-slate-700`
  const vip = `${base} bg-amber-500 text-white hover:bg-amber-600`

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className={secondary} onClick={onNewNormal}>
        New Normal Order
      </button>
      <button className={vip} onClick={onNewVip}>
        New VIP Order
      </button>

      <span className="mx-1 h-6 w-px bg-slate-200" aria-hidden />

      <button className={primary} onClick={onAddBot}>
        Add Bot
      </button>
      <button className={secondary} onClick={onRemoveBot} disabled={botCount === 0}>
        Remove Bot
      </button>
    </div>
  )
}
