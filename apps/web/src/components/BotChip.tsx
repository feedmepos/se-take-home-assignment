import { motion } from 'framer-motion';
import { BotStatus, PROCESSING_DURATION_MS, type BotSnapshot } from '@feedme/core';

interface BotChipProps {
  bot: BotSnapshot;
  startedAt?: number | undefined;
  now: number;
}

export function BotChip({ bot, startedAt, now }: BotChipProps): JSX.Element {
  const busy = bot.status === BotStatus.PROCESSING;
  const elapsed = startedAt ? now - startedAt : 0;
  const secondsLeft = Math.max(0, Math.ceil((PROCESSING_DURATION_MS - elapsed) / 1000));
  const progress = Math.min(1, elapsed / PROCESSING_DURATION_MS);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={[
        'flex items-center gap-3 rounded-xl border px-3.5 py-2.5',
        busy ? 'border-gold/30 bg-gold/[0.06]' : 'border-line/8 bg-surface',
      ].join(' ')}
    >
      {busy ? (
        <span
          className="relative grid h-7 w-7 place-items-center rounded-full"
          style={{
            background: `conic-gradient(#FFC72C ${progress * 360}deg, rgb(var(--line) / 0.12) 0deg)`,
          }}
        >
          <span className="grid h-5 w-5 place-items-center rounded-full bg-surface font-mono text-[10px] text-gold">
            {secondsLeft}
          </span>
        </span>
      ) : (
        <span className="grid h-7 w-7 place-items-center rounded-full bg-fg/5">
          <span className="h-2 w-2 animate-pulse-dot rounded-full bg-fg/40" />
        </span>
      )}

      <div className="leading-tight">
        <p className="font-mono text-sm text-fg">Bot #{bot.id}</p>
        <p
          className={[
            'text-[11px] font-medium uppercase tracking-wider',
            busy ? 'text-gold' : 'text-fg/40',
          ].join(' ')}
        >
          {busy ? `Cooking #${bot.currentOrderId}` : 'Idle'}
        </p>
      </div>
    </motion.div>
  );
}
