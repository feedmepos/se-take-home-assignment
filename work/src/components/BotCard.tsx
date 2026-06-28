import {
  Bot,
  PROCESSING_TIME_MS,
  getRemainingSeconds,
} from "../domain/orderController";
import { OrderCard } from "./OrderCard";

interface BotCardProps {
  bot: Bot;
  now: number;
}

export function BotCard({ bot, now }: BotCardProps) {
  const remainingSeconds = getRemainingSeconds(bot, now);
  const order = bot.currentOrder;
  // 使用同一份时间差同时计算倒计时和进度，确保两个视觉反馈保持一致。
  const progressPercent = order
    ? Math.min(
        100,
        Math.max(0, ((now - order.startedAt) / PROCESSING_TIME_MS) * 100),
      )
    : 0;

  return (
    <article className={`bot-card ${bot.status}`}>
      <div>
        <h3>机器人 #{bot.id}</h3>
        <span>{bot.status === "processing" ? "处理中" : "空闲"}</span>
      </div>
      {order ? (
        <>
          <OrderCard order={order} compact />
          <div className="timer" aria-label="处理倒计时">
            <span>{remainingSeconds} 秒</span>
            <div>
              <div style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </>
      ) : (
        <p className="empty-copy">等待下一笔订单</p>
      )}
    </article>
  );
}
