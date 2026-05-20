'use client';

import type { Order } from '../types';

interface OrderCardProps {
  order: Order;
}

export function OrderCard({ order }: OrderCardProps) {
  return (
    <article
      className={[
        'relative overflow-hidden rounded-2xl border p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.07)]',
        order.type === 'vip' ? 'border-amber-200 bg-amber-50/90' : 'border-slate-200 bg-white',
      ].join(' ')}
    >
      {order.status === 'processing' ? (
        <div className="absolute inset-x-0 top-0 h-1 bg-[#FFC72C]" />
      ) : null}

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold text-slate-950">Order #{order.id}</p>
          <p className="mt-1 text-sm text-slate-600">
            {order.type === 'vip' ? '⭐ VIP' : '📋 Normal'}
          </p>
        </div>

        <span
          className={[
            'rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em]',
            order.type === 'vip'
              ? 'bg-amber-400 text-slate-950'
              : 'bg-slate-200 text-slate-700',
          ].join(' ')}
        >
          {order.status}
        </span>
      </div>

      <div className="mt-4">
        {order.status === 'processing' ? (
          <>
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-500">
              <span>Processing</span>
              <span>10s</span>
            </div>
            <div className="overflow-hidden rounded-full bg-slate-200">
              <div className="h-2 rounded-full bg-[#DA291C] order-progress" />
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">
            {order.status === 'complete' ? 'Completed and ready.' : 'Waiting in the queue.'}
          </p>
        )}
      </div>
    </article>
  );
}
