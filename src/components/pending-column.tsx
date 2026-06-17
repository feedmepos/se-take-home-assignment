import { usePendingOrders } from '@/store/use-order-controller';
import { OrderCard } from './order-card';

export function PendingColumn() {
  const pending = usePendingOrders();

  return (
    <div className="flex-1 min-w-0">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">
        Pending{' '}
        <span className="ml-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
          {pending.length}
        </span>
      </h2>
      <div className="flex flex-col gap-2">
        {pending.map((order) => (
          // Stable key by id — never array index
          <OrderCard key={order.id} order={order} />
        ))}
        {pending.length === 0 && <p className="text-sm text-slate-400 italic">No pending orders</p>}
      </div>
    </div>
  );
}
