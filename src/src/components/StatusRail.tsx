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
    { label: 'Pending', value: pendingCount },
    { label: 'Processing', value: processingCount },
    { label: 'Complete', value: completeCount },
    { label: 'Bots', value: botCount },
  ]

  return (
    <section className="grid gap-3 md:grid-cols-4">
      {items.map(({ label, value }) => (
        <div key={label} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-bold text-zinc-500">{label}</p>
          <p className="mt-3 text-3xl font-black text-zinc-950">{value}</p>
        </div>
      ))}
    </section>
  )
}
