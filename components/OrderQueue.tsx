'use client';

import { useAppContext } from '../context/AppContext';
import { getCompletedOrders, getPendingOrders } from '../store/selectors';

import { OrderCard } from './OrderCard';

export function OrderQueue() {
  const { state } = useAppContext();
  const pendingOrders = getPendingOrders(state);
  const completedOrders = getCompletedOrders(state);

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] backdrop-blur">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-red-700">Pending</p>
            <h2 className="text-2xl font-semibold text-slate-950">Queue</h2>
          </div>
          <p className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
            PENDING ({pendingOrders.length})
          </p>
        </div>

        {pendingOrders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
            No pending orders right now.
          </div>
        ) : (
          <div className="grid gap-3">
            {pendingOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] backdrop-blur">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-red-700">Complete</p>
            <h2 className="text-2xl font-semibold text-slate-950">Finished orders</h2>
          </div>
          <p className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
            COMPLETE ({completedOrders.length})
          </p>
        </div>

        {completedOrders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
            Completed orders will appear here.
          </div>
        ) : (
          <div className="grid gap-3">
            {completedOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
