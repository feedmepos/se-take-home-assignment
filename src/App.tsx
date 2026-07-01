import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Bot,
  Clock3,
  Crown,
  History,
  Minus,
  Plus,
  RotateCcw,
  ShoppingBag,
  TimerReset,
  User,
} from "lucide-react";
import {
  ControllerState,
  Order,
  OrderController,
  formatClock,
  formatOrderType,
  getOrderProgress,
  getRemainingSeconds,
} from "./orderController";

function App() {
  const controllerRef = useRef(new OrderController());
  const [now, setNow] = useState(Date.now());
  const [state, setState] = useState<ControllerState>(() => controllerRef.current.reset(Date.now()));

  useEffect(() => {
    const timer = window.setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      setState(controllerRef.current.tick(currentTime));
    }, 250);

    return () => window.clearInterval(timer);
  }, []);

  const orderById = useMemo(() => new Map(state.orders.map((order) => [order.id, order])), [state.orders]);
  const pendingOrders = state.pendingOrderIds.map((id) => orderById.get(id)).filter(Boolean) as Order[];
  const processingOrders = state.orders
    .filter((order) => order.status === "PROCESSING")
    .sort((a, b) => (a.assignedBotId ?? 0) - (b.assignedBotId ?? 0));
  const completedOrders = state.orders
    .filter((order) => order.status === "COMPLETE")
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

  const vipCompleted = completedOrders.filter((order) => order.type === "VIP").length;
  const normalCompleted = completedOrders.filter((order) => order.type === "NORMAL").length;

  const sync = (nextState: ControllerState) => {
    setNow(Date.now());
    setState(nextState);
  };

  const reset = () => {
    sync(controllerRef.current.reset(Date.now()));
  };

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">FeedMe take-home assignment</p>
          <h1>Order Controller</h1>
        </div>
        <div className="clock">
          <Clock3 size={18} />
          {formatClock(now)}
        </div>
      </section>

      <section className="control-band" aria-label="Order and bot controls">
        <button className="button button-normal" onClick={() => sync(controllerRef.current.createOrder("NORMAL", Date.now()))}>
          <User size={18} />
          New Normal Order
        </button>
        <button className="button button-vip" onClick={() => sync(controllerRef.current.createOrder("VIP", Date.now()))}>
          <Crown size={18} />
          New VIP Order
        </button>
        <button
          className="button button-add"
          onClick={() => sync(controllerRef.current.addBot(Date.now()))}
          aria-label="Add bot"
        >
          <Plus size={18} />
          Bot
        </button>
        <button
          className="button button-remove"
          onClick={() => sync(controllerRef.current.removeNewestBot(Date.now()))}
          aria-label="Remove newest bot"
        >
          <Minus size={18} />
          Bot
        </button>
        <button className="icon-button" onClick={reset} aria-label="Reset system" title="Reset system">
          <RotateCcw size={19} />
        </button>
      </section>

      <section className="stats-grid" aria-label="System summary">
        <Metric label="Pending" value={pendingOrders.length} />
        <Metric label="Processing" value={processingOrders.length} />
        <Metric label="Complete" value={completedOrders.length} detail={`${vipCompleted} VIP / ${normalCompleted} Normal`} />
        <Metric label="Active Bots" value={state.bots.length} detail={`${state.bots.filter((bot) => bot.status === "IDLE").length} idle`} />
      </section>

      <section className="workspace">
        <BoardColumn title="Pending" count={pendingOrders.length}>
          {pendingOrders.length === 0 ? <EmptyState label="No pending orders" /> : pendingOrders.map((order) => <OrderRow key={order.id} order={order} />)}
        </BoardColumn>

        <BoardColumn title="Processing" count={processingOrders.length}>
          {processingOrders.length === 0 ? (
            <EmptyState label="No orders in process" />
          ) : (
            processingOrders.map((order) => (
              <ProcessingRow key={order.id} order={order} now={now} />
            ))
          )}
        </BoardColumn>

        <BoardColumn title="Complete" count={completedOrders.length}>
          {completedOrders.length === 0 ? (
            <EmptyState label="No completed orders" />
          ) : (
            completedOrders.map((order) => <OrderRow key={order.id} order={order} timestamp={order.completedAt} />)
          )}
        </BoardColumn>
      </section>

      <section className="lower-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Fleet</p>
              <h2>Cooking Bots</h2>
            </div>
            <Bot size={22} />
          </div>
          <div className="bot-list">
            {state.bots.length === 0 ? (
              <EmptyState label="No active bots" />
            ) : (
              state.bots.map((bot) => {
                const order = bot.currentOrderId ? orderById.get(bot.currentOrderId) : undefined;
                return (
                  <div className="bot-row" key={bot.id}>
                    <div>
                      <strong>Bot #{bot.id}</strong>
                      <span>{bot.status === "IDLE" ? "Idle" : `Order #${bot.currentOrderId}`}</span>
                    </div>
                    <span className={`status-pill ${bot.status.toLowerCase()}`}>{bot.status}</span>
                    {order ? <ProgressBar value={getOrderProgress(order, now)} /> : null}
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Timeline</p>
              <h2>Event Log</h2>
            </div>
            <History size={22} />
          </div>
          <ol className="log-list">
            {state.logs.map((log) => (
              <li key={log.id}>
                <time>{formatClock(log.at)}</time>
                <span>{log.message}</span>
              </li>
            ))}
          </ol>
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: number; detail?: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

function BoardColumn({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section className="column">
      <header>
        <h2>{title}</h2>
        <span>{count}</span>
      </header>
      <div className="column-body">{children}</div>
    </section>
  );
}

function OrderRow({ order, timestamp }: { order: Order; timestamp?: number }) {
  return (
    <article className={`order-row ${order.type.toLowerCase()}`}>
      <div className="order-main">
        <span className="order-icon">{order.type === "VIP" ? <Crown size={17} /> : <ShoppingBag size={17} />}</span>
        <div>
          <strong>Order #{order.id}</strong>
          <span>{formatOrderType(order.type)}</span>
        </div>
      </div>
      {timestamp ? <time>{formatClock(timestamp)}</time> : <StatusBadge status={order.status} />}
    </article>
  );
}

function ProcessingRow({ order, now }: { order: Order; now: number }) {
  return (
    <article className={`order-row processing ${order.type.toLowerCase()}`}>
      <div className="order-main">
        <span className="order-icon"><TimerReset size={17} /></span>
        <div>
          <strong>Order #{order.id}</strong>
          <span>Bot #{order.assignedBotId} · {getRemainingSeconds(order, now)}s</span>
        </div>
      </div>
      <StatusBadge status={order.status} />
      <ProgressBar value={getOrderProgress(order, now)} />
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`status-pill ${status.toLowerCase()}`}>{status}</span>;
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="progress" aria-hidden="true">
      <span style={{ width: `${value}%` }} />
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="empty-state">{label}</p>;
}

export default App;
