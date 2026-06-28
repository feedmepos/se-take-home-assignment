import { Bot } from "../domain/orderController";
import { BotCard } from "./BotCard";

interface BotColumnProps {
  bots: Bot[];
  now: number;
}

export function BotColumn({ bots, now }: BotColumnProps) {
  return (
    <section className="flow-column bot-column">
      <div className="section-heading">
        <div>
          <h2>机器人 / 处理中</h2>
          <p>每个机器人同一时间只能处理一笔订单</p>
        </div>
        <span>{bots.length}</span>
      </div>
      <div className="order-list">
        {bots.length ? (
          bots.map((bot) => <BotCard key={bot.id} bot={bot} now={now} />)
        ) : (
          <p className="empty-copy">暂无机器人</p>
        )}
      </div>
    </section>
  );
}
