'use client';

import { useAppContext } from '../context/AppContext';
import type { Bot } from '../types';

interface BotCardProps {
  bot: Bot;
}

export function BotCard({ bot }: BotCardProps) {
  const { state } = useAppContext();
  const currentOrder = state.orders.find((order) => order.id === bot.currentOrderId);

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.07)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold text-slate-950">Bot #{bot.id}</p>
          <p className="mt-1 text-sm text-slate-600">
            {bot.status === 'idle'
              ? 'IDLE'
              : `PROCESSING Order #${currentOrder?.id ?? bot.currentOrderId}`}
          </p>
        </div>

        <span
          className={[
            'rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em]',
            bot.status === 'idle'
              ? 'bg-slate-200 text-slate-700'
              : 'bg-emerald-100 text-emerald-900',
          ].join(' ')}
        >
          {bot.status}
        </span>
      </div>

      <div className="mt-4">
        {bot.status === 'processing' ? (
          <>
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-500">
              <span>Current order</span>
              <span>Active</span>
            </div>
            <div className="overflow-hidden rounded-full bg-slate-200">
              <div className="h-2 rounded-full bg-emerald-500 bot-progress" />
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">Waiting for the next pending order.</p>
        )}
      </div>
    </article>
  );
}
