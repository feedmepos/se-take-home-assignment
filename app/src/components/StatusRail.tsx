import { Activity, CheckCircle2, Clock3, CookingPot } from 'lucide-react'

type StatusRailProps = {
  pendingCount: number
  processingCount: number
  completeCount: number
  botCount: number
}

/**
 * Summarizes the current controller totals above the operational panels.
 *
 * @example
 * <StatusRail pendingCount={1} processingCount={2} completeCount={3} botCount={2} />
 */
export const StatusRail = ({
  pendingCount,
  processingCount,
  completeCount,
  botCount,
}: StatusRailProps) => {
  const items = [
    { label: 'Pending', value: pendingCount, icon: Clock3 },
    { label: 'Processing', value: processingCount, icon: Activity },
    { label: 'Complete', value: completeCount, icon: CheckCircle2 },
    { label: 'Bots', value: botCount, icon: CookingPot },
  ]

  return (
    <section className="grid gap-3 md:grid-cols-4">
      {items.map(({ label, value, icon: Icon }) => (
        <div key={label} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-zinc-500">{label}</p>
            <Icon aria-hidden="true" className="text-red-700" size={18} />
          </div>
          <p className="mt-3 text-3xl font-black text-zinc-950">{value}</p>
        </div>
      ))}
    </section>
  )
}
