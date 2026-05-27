import type { BotDTO, OrderDTO } from '@contracts';
import { OrderCard } from './OrderCard';
import { Countdown } from './Countdown';

interface BotListProps {
  bots: BotDTO[];
  processing: { order: OrderDTO; botId: number }[];
  cookDurationMs: number;
}

export function BotList({ bots, processing, cookDurationMs }: BotListProps): React.ReactElement {
  return (
    <section>
      <h2 className="text-lg font-bold mb-2">Bots</h2>
      {bots.length === 0 ? (
        <p className="text-base-content/50">No bots</p>
      ) : (
        <div className="flex flex-col gap-2">
          {bots.map((bot) => {
            const entry = bot.status === 'PROCESSING'
              ? processing.find((p) => p.botId === bot.id) ?? null
              : null;

            return (
              <div key={bot.id} className="card card-bordered bg-base-100 shadow-sm p-4">
                <div className="font-semibold mb-1">Bot #{bot.id}</div>
                {entry !== null ? (
                  <div>
                    <OrderCard order={entry.order} />
                    <Countdown
                      startedAt={entry.order.startedAt!}
                      cookDurationMs={cookDurationMs}
                    />
                  </div>
                ) : (
                  <span className="text-base-content/50">Idle</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
