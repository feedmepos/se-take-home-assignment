import { useCompleteOrders } from '@/store/use-order-controller';
import { OrderCard } from './order-card';

export function CompleteColumn() {
  const complete = useCompleteOrders();

  return (
    <div className="flex-1 min-w-0">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">
        Complete{' '}
        <span className="ml-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
          {complete.length}
        </span>
      </h2>
      <div className="flex flex-col gap-2">
        {complete.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
        {complete.length === 0 && (
          <p className="text-sm text-slate-400 italic">No completed orders</p>
        )}
      </div>
    </div>
  );
}
