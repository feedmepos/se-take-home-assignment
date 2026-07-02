import type { ReactNode } from 'react'

interface ColumnProps {
  title: string
  count: number
  /** Tailwind bg class for the small status dot beside the title. */
  dotClass: string
  emptyText: string
  children: ReactNode
}

export function Column({ title, count, dotClass, emptyText, children }: ColumnProps) {
  return (
    <section className="flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <span className={`h-2 w-2 rounded-full ${dotClass}`} />
          {title}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          {count}
        </span>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto rounded-b-lg bg-slate-50 p-3">
        {count === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">{emptyText}</p>
        ) : (
          children
        )}
      </div>
    </section>
  )
}
