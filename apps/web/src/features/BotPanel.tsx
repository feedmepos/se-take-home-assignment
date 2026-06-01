import { AnimatePresence } from 'framer-motion';
import { useKitchenStore } from '../store/useKitchenStore';
import { useNow } from '../hooks/useNow';
import { BotChip } from '../components/BotChip';

export function BotPanel(): JSX.Element {
  const now = useNow();
  const bots = useKitchenStore((s) => s.bots);
  const startedAt = useKitchenStore((s) => s.startedAt);

  return (
    <section className="rounded-3xl border border-line/6 bg-panel/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-fg/60">
          Cooking Bots
        </h2>
        <span className="font-mono text-xs text-fg/40">{bots.length} active</span>
      </div>

      {bots.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line/10 py-6 text-center text-xs font-medium uppercase tracking-[0.18em] text-fg/30">
          No bots — add one to start cooking
        </p>
      ) : (
        <div className="flex flex-wrap gap-2.5">
          <AnimatePresence mode="popLayout" initial={false}>
            {bots.map((bot) => (
              <BotChip
                key={bot.id}
                bot={bot}
                now={now}
                startedAt={bot.currentOrderId ? startedAt[bot.currentOrderId] : undefined}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
