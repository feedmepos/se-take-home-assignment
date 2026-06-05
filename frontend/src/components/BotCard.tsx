import type { Bot, Order } from '../domain/types';
import { OrderCard } from './OrderCard';

interface BotCardProps {
  bot: Bot;
  remainingMs: number;
  progress: number;
}

function formatSeconds(ms: number): number {
  return Math.ceil(ms / 1000);
}

export function BotCard({ bot, remainingMs, progress }: BotCardProps) {
  const isProcessing = bot.status === 'PROCESSING' && bot.currentOrder;

  return (
    <article className={`bot-card bot-card--${bot.status.toLowerCase()}`}>
      <div className="bot-card__header">
        <h3>Bot #{bot.id}</h3>
        <span className="bot-card__status">{bot.status}</span>
      </div>

      {isProcessing ? (
        <div className="bot-card__processing">
          <OrderCard order={bot.currentOrder as Order} />
          <div className="bot-card__progress">
            <div
              className="bot-card__progress-bar"
              style={{ width: `${Math.min(progress * 100, 100)}%` }}
            />
          </div>
          <p className="bot-card__timer">{formatSeconds(remainingMs)}s remaining</p>
        </div>
      ) : (
        <p className="bot-card__idle">Waiting for orders</p>
      )}
    </article>
  );
}
