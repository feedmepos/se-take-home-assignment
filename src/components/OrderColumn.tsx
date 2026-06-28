import type { Order } from '../domain/types';
import { OrderCard } from './OrderCard';

interface Props {
  title: string;
  variant: 'pending' | 'complete';
  orders: Order[];
  showPosition?: boolean;
}

export function OrderColumn({ title, variant, orders, showPosition }: Props) {
  return (
    <section className={`column column--${variant}`} aria-label={title}>
      <header className="column__header">
        <h2>{title}</h2>
        <span className="column__count">{orders.length}</span>
      </header>
      {orders.length === 0 ? (
        <p className="column__empty">No orders</p>
      ) : (
        <ul className="column__list">
          {orders.map((order, i) => (
            <OrderCard key={order.id} order={order} position={showPosition ? i + 1 : undefined} />
          ))}
        </ul>
      )}
    </section>
  );
}
