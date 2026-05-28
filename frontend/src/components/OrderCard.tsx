import type { OrderDTO } from '@contracts';

interface OrderCardProps {
  order: OrderDTO;
}

export function OrderCard({ order }: OrderCardProps): React.ReactElement {
  const label = order.type === 'VIP' ? `VIP Order #${order.id}` : `Normal Order #${order.id}`;

  return (
    <div className="flex justify-between items-center gap-2 py-1">
      <span className="font-medium text-sm">
        {label}
        {order.type === 'VIP' ? (
          <span className="badge badge-secondary badge-sm ml-2">VIP</span>
        ) : null}
      </span>
      <span className="badge badge-outline badge-sm shrink-0">{order.status}</span>
    </div>
  );
}
