import type { ReactNode } from 'react'

interface ColumnProps {
  title: string
  count: number
  /** Tailwind classes for the header accent (bg + text). */
  accent: string
  emptyText: string
  children: ReactNode
}

/** A titled, scrollable area (PENDING / COMPLETE) with a live item count. */
export function Column({ title, count, accent, emptyText, children }: ColumnProps) {
  return (
    <section className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-slate-50">
      <header
        className={`flex items-center justify-between rounded-t-xl px-4 py-2 font-semibold ${accent}`}
      >
        <span>{title}</span>
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-sm font-bold text-slate-700">
          {count}
        </span>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {count === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">{emptyText}</p>
        ) : (
          children
        )}
      </div>
    </section>
  )
}
