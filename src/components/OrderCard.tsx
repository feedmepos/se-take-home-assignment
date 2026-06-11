import type { Order } from '@/types';
import { formatOrderNumber } from '@/hooks/useKitchenState';
import ProgressBar from './ProgressBar';
import styles from './OrderCard.module.css';

export default function OrderCard({ order, progress }: { order: Order; progress?: number }) {
  return (
    <div className={`${styles.card} ${styles[order.status.toLowerCase()]} ${order.type === 'VIP' ? styles.vip : ''}`}>
      <div className={styles.header}>
        <span className={styles.orderNumber}>#{formatOrderNumber(order.orderNumber)}</span>
        <span className={`${styles.badge} ${styles[order.type.toLowerCase()]}`}>{order.type}</span>
      </div>
      <span className={styles.status}>{order.status}</span>
      {order.status === 'PROCESSING' && progress !== undefined && (
        <ProgressBar percent={progress} />
      )}
    </div>
  );
}
