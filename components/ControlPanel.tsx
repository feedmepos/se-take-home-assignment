'use client';

import { useAppContext } from '../context/AppContext';

export function ControlPanel() {
  const { state, dispatch, removeNewestBot } = useAppContext();

  return (
    <section className="rounded-3xl border border-amber-200 bg-white/95 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] backdrop-blur">
      <div className="mb-4 flex flex-col gap-1">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-red-700">
          Control Panel
        </p>
        <h2 className="text-2xl font-semibold text-slate-950">Order and bot actions</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          aria-label="Create a new normal order"
          className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC72C] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          onClick={() => dispatch({ type: 'ADD_ORDER', payload: { isVip: false } })}
        >
          New Normal Order
        </button>
        <button
          type="button"
          aria-label="Create a new VIP order"
          className="rounded-2xl bg-[#FFC72C] px-4 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA291C] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          onClick={() => dispatch({ type: 'ADD_ORDER', payload: { isVip: true } })}
        >
          New VIP Order
        </button>
        <button
          type="button"
          aria-label="Add a new bot"
          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          onClick={() => dispatch({ type: 'ADD_BOT' })}
        >
          + Bot
        </button>
        <button
          type="button"
          aria-label="Remove the newest bot"
          className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900 shadow-sm transition enabled:hover:-translate-y-0.5 enabled:hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA291C] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={state.bots.length === 0}
          onClick={removeNewestBot}
        >
          - Bot
        </button>
      </div>
    </section>
  );
}
