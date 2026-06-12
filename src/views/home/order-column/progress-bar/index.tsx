import styles from './progress-bar.module.css';

export default function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div className={styles.track}>
      <div className={styles.fill} style={{ width: `${clamped}%` }} />
    </div>
  );
}
