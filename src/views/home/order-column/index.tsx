import type { Order } from '@/types';
import OrderCard from './order-card';
import styles from './order-column.module.css';

export default function OrderColumn({
  title,
  orders,
}: {
  title: string;
  orders: Order[];
}) {
  return (
    <div className={styles.column}>
      <h3 className={styles.heading}>
        {title} <span className={styles.count}>({orders.length})</span>
      </h3>
      <div className={styles.list}>
        {orders.length === 0 ? (
          <p className={styles.empty}>No orders</p>
        ) : (
          orders.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))
        )}
      </div>
    </div>
  );
}
