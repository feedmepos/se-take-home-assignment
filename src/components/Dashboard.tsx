'use client';

import { useKitchenState } from '@/hooks/useKitchenState';
import { PROCESSING_TIME_MS } from '@/constants';
import OrderColumn from './OrderColumn';
import BotControls from './BotControls';
import OrderControls from './OrderControls';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const {
    state,
    pendingOrders,
    processingOrders,
    completedOrders,
    addNormalOrder,
    addVipOrder,
    addBot,
    removeBot,
  } = useKitchenState();

  const now = Date.now();
  const progress = new Map<string, number>(
    processingOrders.map((o) => [
      o.id,
      o.processingStartedAt
        ? Math.min(100, ((now - o.processingStartedAt) / PROCESSING_TIME_MS) * 100)
        : 0,
    ])
  );

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <h1 className={styles.title}>🍔 McDonald&apos;s KDS</h1>
        <div className={styles.controls}>
          <OrderControls onNewNormalOrder={addNormalOrder} onNewVipOrder={addVipOrder} />
          <BotControls bots={state.bots} onAddBot={addBot} onRemoveBot={removeBot} processingOrders={processingOrders} />
        </div>
      </header>
      <div className={styles.columns}>
        <OrderColumn title="⏳ PENDING" orders={pendingOrders} />
        <OrderColumn title="🔄 PROCESSING" orders={processingOrders} processingProgress={progress} />
        <OrderColumn title="✅ COMPLETE" orders={completedOrders} />
      </div>
    </div>
  );
}
