import type { Order } from '../domain/types';

interface OrderCardProps {
  order: Order;
}

export function OrderCard({ order }: OrderCardProps) {
  return (
    <article className={`order-card order-card--${order.type.toLowerCase()}`}>
      <div className="order-card__header">
        <span className="order-card__badge">
          {order.type === 'VIP' ? 'VIP' : 'Normal'}
        </span>
        <span className="order-card__id">#{order.id}</span>
      </div>
      <p className="order-card__status">{order.status}</p>
    </article>
  );
}
