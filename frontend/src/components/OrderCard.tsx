import type { OrderDTO } from '@contracts';

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

  // No status badge here: the Kanban column (Pending / Complete) already encodes
  // the order's status. The optional trailing slot carries the countdown in the
  // Bots column. Bot Idle/Processing state still uses StatusBadge (it has no column).
  return (
    <div className="flex justify-between items-center gap-2 py-1">
      <span className={titleClass}>{label}</span>
      {trailing !== undefined ? trailing : null}
    </div>
  );
}
