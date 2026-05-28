import type { OrderDTO } from '@contracts';
import { OrderCard } from './OrderCard';

interface CompleteListProps {
  orders: OrderDTO[];
}

export function CompleteList({ orders }: CompleteListProps): React.ReactElement {
  const sorted = [...orders].sort((a, b) => {
    const ta = a.completedAt !== undefined ? Date.parse(a.completedAt) : -Infinity;
    const tb = b.completedAt !== undefined ? Date.parse(b.completedAt) : -Infinity;
    return tb - ta;
  });

  return (
    <section className="h-full flex flex-col min-h-0 bg-base-100 rounded-box shadow-sm">
      <h2 className="text-sm font-bold uppercase tracking-wide px-4 pt-4 pb-2 border-b border-base-300 shrink-0">
        Complete <span className="badge badge-success badge-sm ml-1">{orders.length}</span>
      </h2>
      <div
        aria-live="polite"
        aria-label="Completed orders"
        className="flex-1 min-h-0 overflow-y-auto px-3 py-2"
      >
        {sorted.length === 0 ? (
          <p className="text-base-content/50 text-sm py-4 text-center">No completed orders</p>
        ) : (
          <div className="flex flex-col divide-y divide-base-200">
            {sorted.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
