import type { Bot, Order } from '@/types';
import { formatOrderNumber } from '@/utils/string';
import styles from './bot-controls.module.css';

export default function BotControls({
  bots,
  onAddBot,
  onRemoveBot,
  processingOrders,
}: {
  bots: Bot[];
  onAddBot: () => void;
  onRemoveBot: () => void;
  processingOrders: Order[];
}) {
  const orderMap = new Map(processingOrders.map((o) => [o.id, o]));

  return (
    <div className={styles.wrapper}>
      <div className={styles.row}>
        <span className={styles.count}>Bots: {bots.length}</span>
        <button className={styles.add} onClick={onAddBot}>+ Bot</button>
        <button className={styles.remove} onClick={onRemoveBot} disabled={bots.length === 0}>- Bot</button>
      </div>
      <ul className={styles.botList}>
        {bots.map((bot) => {
          const order = bot.currentOrderId ? orderMap.get(bot.currentOrderId) : null;
          return (
            <li key={bot.id} className={styles.botItem}>
              🤖 #{bot.id} — {bot.status === 'IDLE' ? 'Idle' : `Processing #${order ? formatOrderNumber(order.orderNumber) : '?'}`}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
