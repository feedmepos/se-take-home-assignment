import type { Bot } from '../domain/types';
import { BotCard } from './BotCard';

export interface BotProgress {
  botId: number;
  remainingMs: number;
  progress: number;
}

interface ProcessingAreaProps {
  bots: Bot[];
  progressByBotId: Map<number, BotProgress>;
}

export function ProcessingArea({ bots, progressByBotId }: ProcessingAreaProps) {
  return (
    <section className="area area--bots" aria-label="Processing area">
      <header className="area__header">
        <h2>Processing</h2>
        <span className="area__count">{bots.length}</span>
      </header>
      <div className="area__content area__content--bots">
        {bots.length === 0 ? (
          <p className="area__empty">No bots available. Click + Bot to add one.</p>
        ) : (
          bots.map((bot) => {
            const progress = progressByBotId.get(bot.id);
            return (
              <BotCard
                key={bot.id}
                bot={bot}
                remainingMs={progress?.remainingMs ?? 0}
                progress={progress?.progress ?? 0}
              />
            );
          })
        )}
      </div>
    </section>
  );
}
