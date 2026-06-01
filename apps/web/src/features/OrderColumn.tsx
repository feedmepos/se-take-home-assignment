import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import type { OrderSnapshot } from '@feedme/core';
import { OrderCard } from '../components/OrderCard';

type Accent = 'gold' | 'plain' | 'mint';

interface OrderColumnProps {
  title: string;
  accent: Accent;
  orders: OrderSnapshot[];
  now: number;
  startedAt: Record<number, number>;
  botByOrder: Record<number, number>;
  emptyHint: string;
}

const dotClass: Record<Accent, string> = {
  gold: 'bg-gold',
  plain: 'bg-fg/30',
  mint: 'bg-mint',
};

export function OrderColumn({
  title,
  accent,
  orders,
  now,
  startedAt,
  botByOrder,
  emptyHint,
}: OrderColumnProps): JSX.Element {
  return (
    <section className="flex min-h-[20rem] flex-col rounded-3xl border border-line/6 bg-panel/60 p-3">
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${dotClass[accent]}`} />
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-fg/60">{title}</h2>
        </div>
        <span className="font-mono text-xs text-fg/40">{orders.length}</span>
      </div>

      <div className="flex flex-1 flex-col gap-2.5">
        <AnimatePresence mode="popLayout" initial={false}>
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              now={now}
              startedAt={startedAt[order.id]}
              botId={botByOrder[order.id]}
            />
          ))}
        </AnimatePresence>

        {orders.length === 0 && <EmptyState hint={emptyHint} />}
      </div>
    </section>
  );
}

function EmptyState({ hint }: { hint: string }): ReactNode {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid flex-1 place-items-center rounded-2xl border border-dashed border-line/10 py-10 text-center"
    >
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-fg/30">{hint}</p>
    </motion.div>
  );
}
