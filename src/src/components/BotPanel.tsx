
import {
  formatRemainingSeconds,
  getBotOrder,
  getProgressPercent,
  getRemainingMs,
} from '../domain/view-model'
import type { Bot, Order } from '../domain/types'

type BotPanelProps = {
  bots: Bot[]
  orders: Order[]
  now: number
}

/**
 * Displays all cooking bots, their current assignment, remaining time, and
 * progress. Receives `now` from the controller so rendering stays deterministic.
 *
 * @example
 * <BotPanel bots={state.bots} orders={state.orders} now={Date.now()} />
 */
export const BotPanel = ({ bots, orders, now }: BotPanelProps) => (
  <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">Cooking bots</p>
        <h2 className="mt-2 text-2xl font-black text-zinc-950">Bot status</h2>
      </div>
      <span className="rounded-md bg-zinc-950 px-3 py-1.5 text-sm font-black text-white">
        {bots.length} online
      </span>
    </div>

    <div className="mt-5 grid gap-3" data-testid="bot-list">
      {bots.length > 0 ? (
        bots
          .toSorted((left, right) => left.id - right.id)
          .map((bot) => <BotCard key={bot.id} bot={bot} orders={orders} now={now} />)
      ) : (
        <div className="grid min-h-32 place-items-center rounded-md border border-dashed border-zinc-300 bg-zinc-50 text-sm font-semibold text-zinc-400">
          No bots
        </div>
      )}
    </div>
  </section>
)

type BotCardProps = {
  bot: Bot
  orders: Order[]
  now: number
}

const BotCard = ({ bot, orders, now }: BotCardProps) => {
  const order = getBotOrder(bot, orders)
  const progress = getProgressPercent(bot, now)
  const remaining = formatRemainingSeconds(getRemainingMs(bot, now))
  const isProcessing = bot.status === 'PROCESSING'

  return (
    <article
      className="rounded-md border border-zinc-200 bg-zinc-50 p-4"
      data-testid={`bot-${bot.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-md bg-red-700 text-white font-black text-lg">
              B{bot.id}
            </span>
            <div>
            <h3 className="text-base font-black text-zinc-950">Bot #{bot.id}</h3>
            <p className="text-sm font-semibold text-zinc-500">
              {isProcessing && order ? `Processing Order #${order.id}` : 'Waiting for orders'}
            </p>
          </div>
        </div>
        <span
          className={[
            'rounded-md px-2.5 py-1 text-xs font-black',
            isProcessing ? 'bg-amber-300 text-zinc-950' : 'bg-emerald-100 text-emerald-800',
          ].join(' ')}
        >
          {bot.status}
        </span>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-[0.12em] text-zinc-500">
          <span>progress</span>
          <span>{isProcessing ? remaining : '--'}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full rounded-full bg-red-700 transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </article>
  )
}
