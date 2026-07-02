import type { Bot } from '../core/types'
import { OrderCard } from './OrderCard'

interface BotPanelProps {
  bots: Bot[]
  now: number
  totalMs: number
}

export function BotPanel({ bots, now, totalMs }: BotPanelProps) {
  return (
    <section className="flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          Cooking Bots
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          {bots.length}
        </span>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto rounded-b-lg bg-slate-50 p-3">
        {bots.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No bots. Add one to start cooking.
          </p>
        ) : (
          bots.map((bot) => {
            const order = bot.currentOrder
            const remainingMs = order?.startedAt
              ? totalMs - (now - order.startedAt)
              : undefined
            return (
              <div
                key={bot.id}
                className="rounded-md border border-slate-200 bg-white p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">
                    Bot #{bot.id}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                      bot.status === 'PROCESSING'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {bot.status}
                  </span>
                </div>
                {order ? (
                  <OrderCard order={order} remainingMs={remainingMs} totalMs={totalMs} />
                ) : (
                  <p className="text-center text-xs text-slate-400">Waiting for orders…</p>
                )}
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
