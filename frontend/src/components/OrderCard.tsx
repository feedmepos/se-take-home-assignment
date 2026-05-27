import type { OrderDTO } from '@contracts';

interface OrderCardProps {
  order: OrderDTO;
}

function formatLabel(order: OrderDTO): string {
  const typeWord = order.type === 'VIP' ? 'VIP' : 'Normal';
  return `${typeWord} Order #${order.id}`;
}

export function OrderCard({ order }: OrderCardProps): React.ReactElement {
  return (
    <div className="card card-bordered bg-base-100 shadow-sm p-4">
      <div className="flex items-center gap-2">
        <span className="font-semibold">{formatLabel(order)}</span>
        {order.type === 'VIP' ? (
          <span className="badge badge-secondary">VIP</span>
        ) : (
          <span />
        )}
      </div>
      <div className="text-sm text-base-content/70 mt-1">{order.status}</div>
    </div>
  );
}
