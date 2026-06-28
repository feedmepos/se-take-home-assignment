import type { BotView } from '../domain/orderSystem';
import { BotCard } from './BotCard';

interface Props {
  bots: BotView[];
  now: number;
  processMs: number;
}

export function BotShelf({ bots, now, processMs }: Props) {
  return (
    <section className="shelf" aria-label="Cooking Bots">
      <header className="column__header">
        <h2>Cooking Bots</h2>
        <span className="column__count">{bots.length}</span>
      </header>
      {bots.length === 0 ? (
        <p className="column__empty">No bots yet — click “+ Bot”.</p>
      ) : (
        <ul className="shelf__list">
          {bots.map((bot) => (
            <BotCard key={bot.id} bot={bot} now={now} processMs={processMs} />
          ))}
        </ul>
      )}
    </section>
  );
}
