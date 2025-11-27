import React from 'react'
import { OrderCard } from './OrderCard'
import { BotStatusCard } from './BotStatusCard'

export interface SectionsProps {
  pendingQueue: number[]
  getOrderById: (id: number) => any
  formatCustomerLabel: (type: 'NORMAL' | 'VIP') => string
  formatTime: (ts?: number) => string
  completeOrders: any[]
  bots: any[]
  processingMs: number
  now: number
}

export const PendingSection: React.FC<Pick<SectionsProps, 'pendingQueue' | 'getOrderById' | 'formatCustomerLabel' | 'formatTime'>> = ({ pendingQueue, getOrderById, formatCustomerLabel, formatTime }) => (
  <div className="column">
    <h2>PENDING</h2>
    <p className="hint">New VIP orders appear before all normal orders (but behind earlier VIPs).</p>
    <div className="card-list">
      {pendingQueue.map(orderId => {
        const order = getOrderById(orderId)
        if (!order) return null
        return (
          <OrderCard
            key={order.id}
            order={order}
            formatCustomerLabel={formatCustomerLabel}
            formatTime={formatTime}
          />
        )
      })}
      {pendingQueue.length === 0 && (<div className="empty-state">No pending orders.</div>)}
    </div>
  </div>
)

export const CompleteSection: React.FC<Pick<SectionsProps, 'completeOrders' | 'formatCustomerLabel' | 'formatTime'>> = ({ completeOrders, formatCustomerLabel, formatTime }) => (
  <div className="column">
    <h2>COMPLETE</h2>
    <div className="card-list">
      {completeOrders.map(order => (
        <OrderCard
          key={order.id}
          order={order}
          variant="complete"
          formatCustomerLabel={formatCustomerLabel}
          formatTime={formatTime}
        />
      ))}
      {completeOrders.length === 0 && (<div className="empty-state">No completed orders yet.</div>)}
    </div>
  </div>
)

export const BotsSection: React.FC<Pick<SectionsProps, 'bots' | 'getOrderById' | 'formatCustomerLabel' | 'formatTime' | 'processingMs' | 'now'>> = ({ bots, getOrderById, formatCustomerLabel, formatTime, processingMs, now }) => (
  <div className="column">
    <h2>Bot Status</h2>
    <div className="card-list">
      {bots.map(bot => (
        <BotStatusCard
          key={bot.id}
          bot={bot}
          getOrderById={(id) => getOrderById(id)}
          formatCustomerLabel={formatCustomerLabel}
          formatTime={formatTime}
          processingMs={processingMs}
          now={now}
        />
      ))}
      {bots.length === 0 && (<div className="empty-state">No bots yet. Click "+ Bot" to start processing.</div>)}
    </div>
  </div>
)
