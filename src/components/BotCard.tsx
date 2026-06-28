import type { BotView } from '../domain/orderSystem';

interface Props {
  bot: BotView;
  now: number;
  processMs: number;
}

export function BotCard({ bot, now, processMs }: Props) {
  const { order } = bot;
  const elapsed = order?.startedAt !== undefined ? now - order.startedAt : 0;
  const pct = order ? Math.min(100, Math.max(0, (elapsed / processMs) * 100)) : 0;
  const remaining = order ? Math.max(0, Math.ceil((processMs - elapsed) / 1000)) : 0;

  return (
    <li className={`bot-card ${order ? 'bot-card--busy' : 'bot-card--idle'}`}>
      <div className="bot-card__head">
        <span className="bot-card__name">🤖 Bot {bot.id}</span>
        <span className="bot-card__state">{order ? 'COOKING' : 'IDLE'}</span>
      </div>

      {order ? (
        <>
          <div className="bot-card__order">
            <span>Order #{order.id}</span>
            <span className={`badge badge--${order.type === 'VIP' ? 'vip' : 'normal'}`}>
              {order.type}
            </span>
            <span className="bot-card__remaining">{remaining}s</span>
          </div>
          <div
            className="progress"
            role="progressbar"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="progress__bar" style={{ width: `${pct}%` }} />
          </div>
        </>
      ) : (
        <p className="bot-card__waiting">Waiting for orders…</p>
      )}
    </li>
  );
}
