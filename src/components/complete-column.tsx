import { useCompleteOrders } from '@/store/use-order-controller';
import { OrderCard } from './order-card';

export function CompleteColumn() {
  const complete = useCompleteOrders();

  return (
    <div className="flex-1 min-w-52 rounded-xl bg-white border border-slate-200 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Complete</h2>
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800">
          {complete.length}
        </span>
      </div>
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
