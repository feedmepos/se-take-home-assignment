import { motion } from 'framer-motion';
import { OrderType, OrderStatus, PROCESSING_DURATION_MS, type OrderSnapshot } from '@feedme/core';
import { formatTime } from '../utils/format';

interface OrderCardProps {
  order: OrderSnapshot;
  /** 处理开始的本地时间戳(仅 processing 列需要)。 */
  startedAt?: number | undefined;
  /** 当前时间,用于计算进度。 */
  now: number;
  /** 正在处理该订单的机器人编号。 */
  botId?: number | undefined;
}

export function OrderCard({ order, startedAt, now, botId }: OrderCardProps): JSX.Element {
  const isVip = order.type === OrderType.VIP;

  const elapsed = startedAt ? now - startedAt : 0;
  const progress = Math.min(1, elapsed / PROCESSING_DURATION_MS);
  const secondsLeft = Math.max(0, Math.ceil((PROCESSING_DURATION_MS - elapsed) / 1000));

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      className={[
        'grain-card relative overflow-hidden rounded-2xl border p-4',
        isVip
          ? 'border-gold/25 bg-[linear-gradient(135deg,rgba(255,199,44,0.10),rgba(255,199,44,0.02))] shadow-[0_10px_30px_-18px_rgba(255,199,44,0.5)]'
          : 'border-white/8 bg-ink-700 shadow-card',
      ].join(' ')}
    >
      {/* 左侧优先级强调条 */}
      <span
        className={[
          'absolute inset-y-0 left-0 w-1',
          isVip ? 'bg-gold' : 'bg-white/10',
        ].join(' ')}
      />

      <header className="flex items-center justify-between gap-3">
        <span className="font-mono text-xl font-medium tracking-tight text-white">
          #{order.id}
        </span>
        <span
          className={[
            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider',
            isVip
              ? 'bg-gold/15 text-gold ring-1 ring-gold/30'
              : 'bg-white/8 text-white/55 ring-1 ring-white/10',
          ].join(' ')}
        >
          {isVip && <span aria-hidden>✦</span>}
          {isVip ? 'VIP' : 'Normal'}
        </span>
      </header>

      <div className="mt-4">
        {order.status === OrderStatus.PENDING && (
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/35">
            In queue
          </p>
        )}

        {order.status === OrderStatus.PROCESSING && (
          <div>
            <div className="mb-2 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider">
              <span className="text-gold">{botId ? `Bot #${botId}` : 'Cooking'}</span>
              <span className="font-mono text-white/55">{secondsLeft}s left</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-gold-deep via-gold to-gold-soft"
                animate={{ width: `${progress * 100}%` }}
                transition={{ ease: 'linear', duration: 0.1 }}
              />
            </div>
          </div>
        )}

        {order.status === OrderStatus.COMPLETE && (
          <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider">
            <span className="inline-flex items-center gap-1.5 text-mint">
              <span aria-hidden>✓</span> Complete
            </span>
            {order.completedAt && (
              <span className="font-mono text-white/35">{formatTime(order.completedAt)}</span>
            )}
          </div>
        )}
      </div>
    </motion.article>
  );
}
