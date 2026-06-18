import { usePendingOrders } from '@/store/use-order-controller';
import { OrderCard } from './order-card';

export function PendingColumn() {
  const pending = usePendingOrders();

  return (
    <div className="flex-1 min-w-52 rounded-xl bg-white border border-slate-200 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Pending</h2>
        {/* Gold chip — same brand gold as VIP badge so the queue feels on-theme */}
        <span className="rounded-full bg-[#FFC72C] px-2 py-0.5 text-xs font-bold text-gray-900">
          {pending.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {pending.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
        {pending.length === 0 && <p className="text-sm text-slate-400 italic">No pending orders</p>}
      </div>
    </div>
  );
}
