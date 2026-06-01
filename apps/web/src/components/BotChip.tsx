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
        busy ? 'border-gold/30 bg-gold/[0.06]' : 'border-white/8 bg-ink-700',
      ].join(' ')}
    >
      {busy ? (
        <span
          className="relative grid h-7 w-7 place-items-center rounded-full"
          style={{
            background: `conic-gradient(#FFC72C ${progress * 360}deg, rgba(255,255,255,0.08) 0deg)`,
          }}
        >
          <span className="grid h-5 w-5 place-items-center rounded-full bg-ink-800 font-mono text-[10px] text-gold">
            {secondsLeft}
          </span>
        </span>
      ) : (
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white/5">
          <span className="h-2 w-2 animate-pulse-dot rounded-full bg-white/40" />
        </span>
      )}

      <div className="leading-tight">
        <p className="font-mono text-sm text-white">Bot #{bot.id}</p>
        <p
          className={[
            'text-[11px] font-medium uppercase tracking-wider',
            busy ? 'text-gold' : 'text-white/40',
          ].join(' ')}
        >
          {busy ? `Cooking #${bot.currentOrderId}` : 'Idle'}
        </p>
      </div>
    </motion.div>
  );
}
