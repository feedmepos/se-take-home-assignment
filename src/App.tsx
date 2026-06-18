import { useEffect, useReducer, useRef } from 'react'
import {
  initialState,
  orderControllerReducer,
  PROCESSING_TIME_MS,
} from './domain/orderController'

function App() {
  const [state, dispatch] = useReducer(orderControllerReducer, initialState)

  // Each active bot gets one browser timer.
  // The map key is botId so the UI can cancel the correct timer if a bot disappears
  // or if its current order changes before the timeout finishes.
  const timersRef = useRef<Map<number, number>>(new Map())

  useEffect(() => {
    for (const bot of state.bots) {
      if (bot.activeOrderId === null || timersRef.current.has(bot.id)) {
        continue
      }

      const timerId = window.setTimeout(() => {
        dispatch({
          type: 'complete_order',
          botId: bot.id,
          orderId: bot.activeOrderId!,
        })
        timersRef.current.delete(bot.id)
      }, PROCESSING_TIME_MS)

      timersRef.current.set(bot.id, timerId)
    }

    // If a bot was removed or its active order was cleared, its old timer must be
    // cancelled so the UI does not complete an order that is no longer processing.
    for (const [botId, timerId] of timersRef.current.entries()) {
      const bot = state.bots.find((currentBot) => currentBot.id === botId)

      if (!bot || bot.activeOrderId === null) {
        window.clearTimeout(timerId)
        timersRef.current.delete(botId)
      }
    }
  }, [state.bots])

  // Clear all timers when React unmounts the page to avoid leaving pending async work
  // behind during tests or hot reloads.
  useEffect(() => {
    return () => {
      for (const timerId of timersRef.current.values()) {
        window.clearTimeout(timerId)
      }
      timersRef.current.clear()
    }
  }, [])

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">FeedMe take-home</p>
          <h1>McDonald's Order Controller</h1>
          <p className="subtitle">
            Create orders, manage cooking bots, and watch VIP priority processing in real time.
          </p>
        </div>

        <div className="controls" aria-label="order controls">
          <button type="button" onClick={() => dispatch({ type: 'create_order', priority: 'NORMAL' })}>
            New Normal Order
          </button>
          <button type="button" onClick={() => dispatch({ type: 'create_order', priority: 'VIP' })}>
            New VIP Order
          </button>
          <button type="button" onClick={() => dispatch({ type: 'add_bot' })}>
            + Bot
          </button>
          <button type="button" onClick={() => dispatch({ type: 'remove_bot' })}>
            - Bot
          </button>
        </div>
      </section>

      <section className="summary-grid" aria-label="summary">
        <article className="summary-card">
          <span className="summary-label">Pending</span>
          <strong>{state.pendingOrders.length}</strong>
        </article>
        <article className="summary-card">
          <span className="summary-label">Processing</span>
          <strong>{state.processingOrders.length}</strong>
        </article>
        <article className="summary-card">
          <span className="summary-label">Completed</span>
          <strong>{state.completedOrders.length}</strong>
        </article>
        <article className="summary-card">
          <span className="summary-label">Bots</span>
          <strong>{state.bots.length}</strong>
        </article>
      </section>

      <section className="board">
        <article className="panel" aria-labelledby="pending-heading">
          <div className="panel-header">
            <h2 id="pending-heading">PENDING</h2>
            <span>{state.pendingOrders.length} orders</span>
          </div>
          <ul className="order-list" data-testid="pending-orders">
            {state.pendingOrders.length === 0 ? (
              <li className="empty-state">No pending orders</li>
            ) : (
              state.pendingOrders.map((order) => (
                <li key={order.id} className="order-card">
                  <span className={`badge badge-${order.priority.toLowerCase()}`}>{order.priority}</span>
                  <strong>Order #{order.id}</strong>
                </li>
              ))
            )}
          </ul>
        </article>

        <article className="panel" aria-labelledby="bots-heading">
          <div className="panel-header">
            <h2 id="bots-heading">BOTS</h2>
            <span>{state.bots.length} active</span>
          </div>
          <ul className="bot-list" data-testid="bot-list">
            {state.bots.length === 0 ? (
              <li className="empty-state">No bots available</li>
            ) : (
              state.bots.map((bot) => (
                <li key={bot.id} className="bot-card">
                  <div>
                    <strong>Bot #{bot.id}</strong>
                    <p>{bot.status === 'IDLE' ? 'IDLE' : `PROCESSING Order #${bot.activeOrderId}`}</p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </article>

        <article className="panel" aria-labelledby="complete-heading">
          <div className="panel-header">
            <h2 id="complete-heading">COMPLETE</h2>
            <span>{state.completedOrders.length} orders</span>
          </div>
          <ul className="order-list" data-testid="completed-orders">
            {state.completedOrders.length === 0 ? (
              <li className="empty-state">No completed orders</li>
            ) : (
              state.completedOrders.map((order) => (
                <li key={order.id} className="order-card">
                  <span className={`badge badge-${order.priority.toLowerCase()}`}>{order.priority}</span>
                  <strong>Order #{order.id}</strong>
                </li>
              ))
            )}
          </ul>
        </article>
      </section>
    </main>
  )
}

export default App
