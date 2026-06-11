import type { Order } from '@/types';
import OrderCard from './OrderCard';
import styles from './OrderColumn.module.css';

export default function OrderColumn({
  title,
  orders,
  processingProgress,
}: {
  title: string;
  orders: Order[];
  processingProgress?: Map<string, number>;
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
            <OrderCard
              key={o.id}
              order={o}
              progress={processingProgress?.get(o.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
