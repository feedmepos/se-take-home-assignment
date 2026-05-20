'use client';

import { useAppContext } from '../context/AppContext';

import { BotCard } from './BotCard';

export function BotList() {
  const { state } = useAppContext();

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] backdrop-blur">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-red-700">Bots</p>
          <h2 className="text-2xl font-semibold text-slate-950">Active cooking crew</h2>
        </div>
        <p className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
          {state.bots.length} total
        </p>
      </div>

      {state.bots.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
          No bots are active yet. Add one to start processing orders.
        </div>
      ) : (
        <div className="grid gap-3">
          {state.bots.map((bot) => (
            <BotCard key={bot.id} bot={bot} />
          ))}
        </div>
      )}
    </section>
  );
}
