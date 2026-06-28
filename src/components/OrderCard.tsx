import type { Order } from '../domain/types';
import { formatTime } from '../utils/formatTime';

interface Props {
  order: Order;
  /** 1-based position in the pending queue, if applicable. */
  position?: number;
}

export function OrderCard({ order, position }: Props) {
  const isVip = order.type === 'VIP';
  return (
    <li className={`order-card ${isVip ? 'order-card--vip' : ''}`}>
      <span className="order-card__id">#{order.id}</span>
      <span className={`badge ${isVip ? 'badge--vip' : 'badge--normal'}`}>{order.type}</span>
      {position !== undefined && <span className="order-card__pos">#{position} in queue</span>}
      {order.status === 'COMPLETE' && order.completedAt !== undefined && (
        <time className="order-card__time">{formatTime(order.completedAt)}</time>
      )}
    </li>
  );
}
