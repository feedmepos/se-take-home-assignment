'use client';

import { useState, useEffect } from 'react';
import type { Order } from '@/types';
import { PROCESSING_TIME_MS } from '@/constants';
import { formatOrderNumber } from '@/utils/string';
import ProgressBar from '../progress-bar';
import styles from './order-card.module.css';

export default function OrderCard({ order }: { order: Order }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (order.status !== 'PROCESSING') return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [order.status]);

  const progress =
    order.status === 'PROCESSING' && order.processingStartedAt != null
      ? Math.min(100, ((now - order.processingStartedAt) / PROCESSING_TIME_MS) * 100)
      : undefined;

  return (
    <div className={`${styles.card} ${styles[order.status.toLowerCase()]} ${order.type === 'VIP' ? styles.vip : ''}`}>
      <div className={styles.header}>
        <span className={styles.orderNumber}>#{formatOrderNumber(order.orderNumber)}</span>
        <span className={`${styles.badge} ${styles[order.type.toLowerCase()]}`}>{order.type}</span>
      </div>
      <span className={styles.status}>{order.status}</span>
      {order.status === 'PROCESSING' && <ProgressBar percent={progress ?? 0} />}
    </div>
  );
}
