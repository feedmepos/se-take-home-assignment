import type { Order } from '../domain/types';
import { OrderCard } from './OrderCard';

interface OrderAreaProps {
  title: string;
  orders: Order[];
  emptyMessage: string;
}

export function OrderArea({ title, orders, emptyMessage }: OrderAreaProps) {
  return (
    <section className="area">
      <header className="area__header">
        <h2>{title}</h2>
        <span className="area__count">{orders.length}</span>
      </header>
      <div className="area__content">
        {orders.length === 0 ? (
          <p className="area__empty">{emptyMessage}</p>
        ) : (
          orders.map((order) => <OrderCard key={order.id} order={order} />)
        )}
      </div>
    </section>
  );
}
