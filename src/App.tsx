import { useOrderSystem } from './hooks/useOrderSystem'
import './App.css'

function OrderCard({ order }: { order: { id: number; type: 'normal' | 'vip' } }) {
  return (
    <div className={`order-card order-card--${order.type}`}>
      <span className="order-card__id">#{order.id}</span>
      <span className="order-card__type">{order.type === 'vip' ? 'VIP' : 'Normal'}</span>
    </div>
  )
}

export default function App() {
  const {
    pendingOrders,
    completeOrders,
    bots,
    addNormalOrder,
    addVipOrder,
    addBot,
    removeBot,
  } = useOrderSystem()

  return (
    <div className="app">
      <header className="header">
        <h1>McDonald&apos;s Order Controller</h1>
        <p>Automated cooking bot order management prototype</p>
      </header>

      <section className="controls">
        <div className="controls__group">
          <h2>Customer Orders</h2>
          <div className="controls__buttons">
            <button type="button" className="btn btn--normal" onClick={addNormalOrder}>
              New Normal Order
            </button>
            <button type="button" className="btn btn--vip" onClick={addVipOrder}>
              New VIP Order
            </button>
          </div>
        </div>

        <div className="controls__group">
          <h2>Manager Controls</h2>
          <div className="controls__buttons">
            <button type="button" className="btn btn--bot-add" onClick={addBot}>
              + Bot
            </button>
            <button
              type="button"
              className="btn btn--bot-remove"
              onClick={removeBot}
              disabled={bots.length === 0}
            >
              - Bot
            </button>
          </div>
        </div>
      </section>

      <section className="bots">
        <h2>Cooking Bots ({bots.length})</h2>
        {bots.length === 0 ? (
          <p className="empty-hint">No bots available. Click &quot;+ Bot&quot; to add one.</p>
        ) : (
          <ul className="bots__list">
            {bots.map((bot) => (
              <li key={bot.id} className={`bot bot--${bot.status}`}>
                <span className="bot__name">Bot #{bot.id}</span>
                <span className="bot__status">{bot.status.toUpperCase()}</span>
                {bot.currentOrderId !== null && (
                  <span className="bot__order">Processing Order #{bot.currentOrderId}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="areas">
        <section className="area area--pending">
          <h2>PENDING ({pendingOrders.length})</h2>
          <div className="area__content">
            {pendingOrders.length === 0 ? (
              <p className="empty-hint">No pending orders</p>
            ) : (
              pendingOrders.map((order) => <OrderCard key={order.id} order={order} />)
            )}
          </div>
        </section>

        <section className="area area--complete">
          <h2>COMPLETE ({completeOrders.length})</h2>
          <div className="area__content">
            {completeOrders.length === 0 ? (
              <p className="empty-hint">No completed orders</p>
            ) : (
              completeOrders.map((order) => <OrderCard key={order.id} order={order} />)
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
