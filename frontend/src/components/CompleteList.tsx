import type { OrderDTO } from '@contracts';
import { OrderCard } from './OrderCard';

interface CompleteListProps {
  orders: OrderDTO[];
}

export function CompleteList({ orders }: CompleteListProps): React.ReactElement {
  return (
    <section>
      <h2 className="text-lg font-bold mb-2">Complete</h2>
      <div aria-live="polite" aria-label="Completed orders">
        {orders.length === 0 ? (
          <p className="text-base-content/50">No completed orders</p>
        ) : (
          <div className="flex flex-col gap-2">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
