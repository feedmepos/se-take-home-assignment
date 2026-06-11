'use client';

import { useMemo } from 'react';
import { useKitchenStore } from '@/store/kitchenStore';
import OrderColumn from '../order-column';
import BotControls from '../bot-controls';
import OrderControls from '../order-controls';
import styles from './dashboard.module.css';

export default function Dashboard() {
  const orders = useKitchenStore((s) => s.orders);
  const bots = useKitchenStore((s) => s.bots);
  const addNormalOrder = useKitchenStore((s) => s.addNormalOrder);
  const addVipOrder = useKitchenStore((s) => s.addVipOrder);
  const addBot = useKitchenStore((s) => s.addBot);
  const removeBot = useKitchenStore((s) => s.removeBot);

  const pendingOrders = useMemo(
    () => orders.filter((o) => o.status === 'PENDING').sort((a, b) => {
      if (a.type !== b.type) return a.type === 'VIP' ? -1 : 1;
      return a.createdAt - b.createdAt;
    }),
    [orders]
  );

  const processingOrders = useMemo(() => orders.filter((o) => o.status === 'PROCESSING'), [orders]);

  const completedOrders = useMemo(
    () => orders.filter((o) => o.status === 'COMPLETE').sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0)),
    [orders]
  );

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <h1 className={styles.title}>🍔 McDonald&apos;s KDS</h1>
        <div className={styles.controls}>
          <OrderControls onNewNormalOrder={addNormalOrder} onNewVipOrder={addVipOrder} />
          <BotControls bots={bots} onAddBot={addBot} onRemoveBot={removeBot} processingOrders={processingOrders} />
        </div>
      </header>
      <div className={styles.columns}>
        <OrderColumn title="⏳ PENDING" orders={pendingOrders} />
        <OrderColumn title="🔄 PROCESSING" orders={processingOrders} />
        <OrderColumn title="✅ COMPLETE" orders={completedOrders} />
      </div>
    </div>
  );
}
