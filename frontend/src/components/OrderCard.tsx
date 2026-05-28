import type { OrderDTO } from '@contracts';
import { StatusBadge } from './StatusBadge';

interface OrderCardProps {
  order: OrderDTO;
  trailing?: React.ReactNode;
}

export function OrderCard({ order, trailing }: OrderCardProps): React.ReactElement {
  const label = order.type === 'VIP' ? `VIP Order #${order.id}` : `Normal Order #${order.id}`;

  const titleClass =
    order.type === 'VIP'
      ? 'font-bold text-sm text-amber-600'
      : 'font-medium text-sm';

  return (
    <div className="flex justify-between items-center gap-2 py-1">
      <span className={titleClass}>{label}</span>
      {trailing !== undefined ? (
        <span className="badge badge-warning badge-sm shrink-0">{trailing}</span>
      ) : (
        <StatusBadge status={order.status} />
      )}
    </div>
  );
}
