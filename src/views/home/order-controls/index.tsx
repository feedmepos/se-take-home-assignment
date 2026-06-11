import styles from './order-controls.module.css';

export default function OrderControls({
  onNewNormalOrder,
  onNewVipOrder,
}: {
  onNewNormalOrder: () => void;
  onNewVipOrder: () => void;
}) {
  return (
    <div className={styles.row}>
      <button className={styles.normal} onClick={onNewNormalOrder}>New Normal Order</button>
      <button className={styles.vip} onClick={onNewVipOrder}>New VIP Order</button>
    </div>
  );
}
