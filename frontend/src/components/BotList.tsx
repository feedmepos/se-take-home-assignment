import type { BotDTO, OrderDTO } from '@contracts';
import { OrderCard } from './OrderCard';
import { Countdown } from './Countdown';
import { StatusBadge } from './StatusBadge';

interface BotListProps {
  bots: BotDTO[];
  processing: { order: OrderDTO; botId: number }[];
  cookDurationMs: number;
}

export function BotList({ bots, processing, cookDurationMs }: BotListProps): React.ReactElement {
  return (
    <section className="bg-base-100 rounded-box shadow-sm flex flex-col">
      <h2 className="text-sm font-bold uppercase tracking-wide px-4 pt-4 pb-2 border-b border-base-300 shrink-0">
        Bots <span className="badge badge-sm ml-1">{bots.length}</span>
      </h2>
      <div className="overflow-y-auto max-h-[calc(100vh-16rem)] px-3 py-2">
        {bots.length === 0 ? (
          <p className="text-base-content/50 text-sm py-4 text-center">No bots</p>
        ) : (
          <div className="flex flex-col gap-2 py-1">
            {bots.map((bot) => {
              const entry =
                bot.status === 'PROCESSING'
                  ? (processing.find((p) => p.botId === bot.id) ?? null)
                  : null;

              return (
                <div key={bot.id} className="card bg-base-200 shadow-xs p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-sm">Bot #{bot.id}</span>
                    <StatusBadge status={bot.status} />
                  </div>
                  {entry !== null ? (
                    <OrderCard
                      order={entry.order}
                      trailing={
                        <Countdown
                          startedAt={entry.order.startedAt!}
                          cookDurationMs={cookDurationMs}
                        />
                      }
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
