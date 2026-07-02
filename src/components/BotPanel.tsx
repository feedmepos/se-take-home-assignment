import type { Bot } from '../core/types'
import { OrderCard } from './OrderCard'

interface BotPanelProps {
  bots: Bot[]
  now: number
  totalMs: number
}

/** Shows every cooking bot, its IDLE/PROCESSING state, and the order (with a
 *  live countdown) it is currently working on. */
export function BotPanel({ bots, now, totalMs }: BotPanelProps) {
  return (
    <section className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-slate-50">
      <header className="flex items-center justify-between rounded-t-xl bg-red-600 px-4 py-2 font-semibold text-white">
        <span>🤖 Cooking Bots</span>
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-sm font-bold">
          {bots.length}
        </span>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
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
                className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Bot #{bot.id}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      bot.status === 'PROCESSING'
                        ? 'bg-green-100 text-green-700'
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
