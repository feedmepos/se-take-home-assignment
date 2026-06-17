import { StrictMode, useEffect, useReducer, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bot,
  ControllerState,
  Order,
  PROCESSING_TIME_MS,
  controllerReducer,
  createInitialState,
  getRemainingSeconds,
} from "./domain/orderController";
import "./styles.css";

const getNow = () => Date.now();

function App() {
  const [state, dispatch] = useReducer(controllerReducer, undefined, () =>
    createInitialState(),
  );
  const [now, setNow] = useState(getNow);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const currentTime = getNow();
      setNow(currentTime);
      dispatch({ type: "tick", now: currentTime });
    }, 250);

    return () => window.clearInterval(intervalId);
  }, []);

  const send = (type: "add-bot" | "remove-bot" | "reset") => {
    const currentTime = getNow();
    setNow(currentTime);
    dispatch({ type, now: currentTime });
  };

  const addOrder = (orderType: "vip" | "normal") => {
    const currentTime = getNow();
    setNow(currentTime);
    dispatch({ type: "add-order", orderType, now: currentTime });
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">FeedMe 面试作业原型</p>
          <h1>麦当劳订单控制器</h1>
        </div>
        <div className="stats" aria-label="订单概览">
          <Stat label="等待中" value={state.pendingOrders.length} />
          <Stat label="机器人" value={state.bots.length} />
          <Stat label="已完成" value={state.completedOrders.length} />
        </div>
      </header>

      <section className="controls" aria-label="订单和机器人操作">
        <button onClick={() => addOrder("normal")}>新增普通订单</button>
        <button className="vip-button" onClick={() => addOrder("vip")}>
          新增 VIP 订单
        </button>
        <button onClick={() => send("add-bot")}>+ 机器人</button>
        <button onClick={() => send("remove-bot")} disabled={!state.bots.length}>
          - 机器人
        </button>
        <button className="secondary-button" onClick={() => send("reset")}>
          重置
        </button>
      </section>

      <section className="workspace" aria-label="订单流转">
        <OrderColumn
          title="等待区"
          subtitle="VIP 订单优先，普通订单保持先来先处理"
          orders={state.pendingOrders}
          emptyText="暂无等待订单"
        />
        <BotColumn state={state} now={now} />
        <OrderColumn
          title="完成区"
          subtitle="机器人处理满 10 秒后进入完成区"
          orders={state.completedOrders}
          emptyText="暂无完成订单"
        />
      </section>

      <section className="activity" aria-label="事件日志">
        <div className="section-heading">
          <h2>事件日志</h2>
          <span className="wide-badge">{state.log.length} 条事件</span>
        </div>
        {state.log.length ? (
          <ol>
            {state.log.map((entry) => (
              <li key={entry.id}>
                <time>{formatTime(entry.at)}</time>
                <span>{entry.message}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="empty-copy">暂无事件</p>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function OrderColumn({
  title,
  subtitle,
  orders,
  emptyText,
}: {
  title: string;
  subtitle: string;
  orders: Order[];
  emptyText: string;
}) {
  return (
    <section className="flow-column">
      <div className="section-heading">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <span>{orders.length}</span>
      </div>
      <div className="order-list">
        {orders.length ? (
          orders.map((order) => <OrderCard key={order.id} order={order} />)
        ) : (
          <p className="empty-copy">{emptyText}</p>
        )}
      </div>
    </section>
  );
}

function BotColumn({ state, now }: { state: ControllerState; now: number }) {
  return (
    <section className="flow-column bot-column">
      <div className="section-heading">
        <div>
          <h2>机器人 / 处理中</h2>
          <p>每个机器人同一时间只能处理一笔订单</p>
        </div>
        <span>{state.bots.length}</span>
      </div>
      <div className="order-list">
        {state.bots.length ? (
          state.bots.map((bot) => <BotCard key={bot.id} bot={bot} now={now} />)
        ) : (
          <p className="empty-copy">暂无机器人</p>
        )}
      </div>
    </section>
  );
}

function BotCard({ bot, now }: { bot: Bot; now: number }) {
  const remainingSeconds = getRemainingSeconds(bot, now);
  const order = bot.currentOrder;
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
              <div
                style={{
                  width: `${progressPercent}%`,
                }}
              />
            </div>
          </div>
        </>
      ) : (
        <p className="empty-copy">等待下一笔订单</p>
      )}
    </article>
  );
}

function OrderCard({ order, compact = false }: { order: Order; compact?: boolean }) {
  return (
    <article className={`order-card ${order.type} ${compact ? "compact" : ""}`}>
      <div>
        <h3>订单 #{order.id}</h3>
        <span>{order.type === "vip" ? "VIP" : "普通"}</span>
      </div>
      <p>创建时间 {formatTime(order.createdAt)}</p>
    </article>
  );
}

function formatTime(value: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(value);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
