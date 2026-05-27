import type { OrderDTO } from '@contracts';
import { OrderCard } from './OrderCard';

interface PendingListProps {
  orders: OrderDTO[];
}

export function PendingList({ orders }: PendingListProps): React.ReactElement {
  return (
    <section>
      <h2 className="text-lg font-bold mb-2">Pending</h2>
      <div aria-live="polite" aria-label="Pending orders">
        {orders.length === 0 ? (
          <p className="text-base-content/50">No pending orders</p>
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
