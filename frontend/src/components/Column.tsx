import type { ReactNode } from 'react'

interface ColumnProps {
  title: string
  count: number
  accent: string
  children: ReactNode
}

export function Column({ title, count, accent, children }: ColumnProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-xl border bg-slate-50/60">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
          {title}
        </h2>
        <span
          className={`flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold text-white ${accent}`}
        >
          {count}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        {count === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Empty</p>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
