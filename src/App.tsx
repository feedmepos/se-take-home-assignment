import { useMemo } from 'react';
import type { Bot, Order } from './domain/orderController';
import { useOrderController } from './hooks/useOrderController';
import type { ActivityLogEntry } from './hooks/useOrderController';
import './App.css';

function orderLabel(order: Order) {
  return `${order.type === 'vip' ? 'VIP' : 'Normal'} Order #${order.id}`;
}

function App() {
  const {
    state,
    processingTimeMs,
    remainingSecondsByBotId,
    activityLog,
    addNormalOrder,
    addVipOrder,
    addBot,
    removeBot,
  } = useOrderController();

  const { activeBots, idleBots } = useMemo(() => {
    const processingCount = state.bots.filter(
      (bot) => bot.status === 'processing',
    ).length;

    return {
      activeBots: processingCount,
      idleBots: state.bots.length - processingCount,
    };
  }, [state.bots]);

  const hasWaitingOrdersWithoutBots =
    state.pendingOrders.length > 0 && state.bots.length === 0;

  return (
    <main className="app">
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">FeedMe Take Home Assignment</p>
        <h1 id="page-title">McDonald's Order Controller</h1>
        <p className="hero-copy">
          A frontend MVP that keeps all orders in memory, prioritizes VIP orders,
          and lets cooking bots process one order every {processingTimeMs / 1000}{' '}
          seconds after pickup.
        </p>
      </section>

      <section className="controls" aria-label="Order controller actions">
        <button onClick={addNormalOrder}>New Normal Order</button>
        <button className="vip-button" onClick={addVipOrder}>
          New VIP Order
        </button>
        <button onClick={addBot}>+ Bot</button>
        <button onClick={removeBot} disabled={state.bots.length === 0}>
          - Bot
        </button>
      </section>

      <section className="summary" aria-label="Controller summary">
        <SummaryCard label="Pending" value={state.pendingOrders.length} />
        <SummaryCard label="Bots" value={state.bots.length} />
        <SummaryCard label="Active" value={activeBots} />
        <SummaryCard label="Idle" value={idleBots} />
        <SummaryCard label="Complete" value={state.completedOrders.length} />
      </section>

      {hasWaitingOrdersWithoutBots ? (
        <p className="notice" role="status">
          Pending orders wait here until a cooking bot is available. Click “+ Bot”
          to start the 10-second cooking process.
        </p>
      ) : null}

      <section className="board" aria-label="Order status board">
        <OrderPanel
          title="PENDING"
          description="Waiting orders. VIP orders stay ahead of normal orders."
          orders={state.pendingOrders}
          emptyMessage="No pending orders."
        />

        <BotPanel bots={state.bots} remainingSecondsByBotId={remainingSecondsByBotId} />

        <OrderPanel
          title="COMPLETE"
          description="Orders completed by cooking bots."
          orders={state.completedOrders}
          emptyMessage="No completed orders yet."
        />
      </section>

      <ActivityLog entries={activityLog} />
    </main>
  );
}

type SummaryCardProps = {
  label: string;
  value: number;
};

function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <div className="summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

type OrderPanelProps = {
  title: string;
  description: string;
  orders: Order[];
  emptyMessage: string;
};

function OrderPanel({ title, description, orders, emptyMessage }: OrderPanelProps) {
  return (
    <article className="panel">
      <PanelHeader title={title} description={description} count={orders.length} />
      {orders.length === 0 ? (
        <p className="empty-state">{emptyMessage}</p>
      ) : (
        <ul className="item-list" aria-label={`${title} orders`}>
          {orders.map((order) => (
            <li className={`order-card ${order.type}`} key={order.id}>
              <span className="badge">{order.type === 'vip' ? 'VIP' : 'Normal'}</span>
              <strong>{orderLabel(order)}</strong>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

type BotPanelProps = {
  bots: Bot[];
  remainingSecondsByBotId: Map<number, number>;
};

function BotPanel({ bots, remainingSecondsByBotId }: BotPanelProps) {
  return (
    <article className="panel bot-panel">
      <PanelHeader
        title="COOKING BOTS"
        description="Each bot processes one order at a time."
        count={bots.length}
      />
      {bots.length === 0 ? (
        <p className="empty-state">No cooking bots. Add one to start processing.</p>
      ) : (
        <ul className="item-list" aria-label="Cooking bots">
          {bots.map((bot) => {
            const remainingSeconds = remainingSecondsByBotId.get(bot.id) ?? 0;
            const progressValue = ((10 - remainingSeconds) / 10) * 100;

            return (
              <li className={`bot-card ${bot.status}`} key={bot.id}>
                <div className="bot-card-main">
                  <div>
                    <strong>Bot #{bot.id}</strong>
                    <p>{bot.status === 'idle' ? 'IDLE' : 'PROCESSING'}</p>
                  </div>
                  {bot.order ? (
                    <span className={`pill ${bot.order.type}`}>{orderLabel(bot.order)}</span>
                  ) : (
                    <span className="pill idle">Waiting for order</span>
                  )}
                </div>

                {bot.order ? (
                  <div className="countdown" aria-label={`Bot #${bot.id} countdown`}>
                    <span>{remainingSeconds}s remaining</span>
                    <div className="progress-track">
                      <div
                        className="progress-bar"
                        style={{ width: `${Math.min(100, Math.max(0, progressValue))}%` }}
                      />
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

type PanelHeaderProps = {
  title: string;
  description: string;
  count: number;
};

function PanelHeader({ title, description, count }: PanelHeaderProps) {
  return (
    <header className="panel-header">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <span className="count-badge">{count}</span>
    </header>
  );
}

type ActivityLogProps = {
  entries: ActivityLogEntry[];
};

function ActivityLog({ entries }: ActivityLogProps) {
  return (
    <section className="activity-log" aria-labelledby="activity-log-title">
      <header className="panel-header">
        <div>
          <h2 id="activity-log-title">ACTIVITY LOG</h2>
          <p>Recent state changes for the live demo.</p>
        </div>
        <span className="count-badge">{entries.length}</span>
      </header>

      {entries.length === 0 ? (
        <p className="empty-state compact">No activity yet. Create an order to begin.</p>
      ) : (
        <ol className="log-list" aria-label="Activity log entries">
          {entries.map((entry) => (
            <li key={entry.id}>
              <time>{entry.time}</time>
              <span>{entry.message}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default App;
