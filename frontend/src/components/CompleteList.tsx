import type { OrderDTO } from '@contracts';
import { OrderCard } from './OrderCard';

interface CompleteListProps {
  orders: OrderDTO[];
}

export function CompleteList({ orders }: CompleteListProps): React.ReactElement {
  return (
    <section className="bg-base-100 rounded-box shadow-sm flex flex-col">
      <h2 className="text-sm font-bold uppercase tracking-wide px-4 pt-4 pb-2 border-b border-base-300 shrink-0">
        Complete <span className="badge badge-sm ml-1">{orders.length}</span>
      </h2>
      <div
        aria-live="polite"
        aria-label="Completed orders"
        className="overflow-y-auto max-h-[calc(100vh-16rem)] px-3 py-2"
      >
        {orders.length === 0 ? (
          <p className="text-base-content/50 text-sm py-4 text-center">No completed orders</p>
        ) : (
          <div className="flex flex-col divide-y divide-base-200">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
