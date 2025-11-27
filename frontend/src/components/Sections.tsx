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
  <div className="section-card">
    <div className="section-card__header">
      <h2>Pending Orders</h2>
    </div>
    <div className="section-card__body">
      {pendingQueue.length === 0 ? (
        <div className="empty">No pending orders</div>
      ) : (
        pendingQueue.map(orderId => {
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
        })
      )}
    </div>
  </div>
)

export const CompleteSection: React.FC<Pick<SectionsProps, 'completeOrders' | 'formatCustomerLabel' | 'formatTime'>> = ({ completeOrders, formatCustomerLabel, formatTime }) => (
  <div className="section-card">
    <div className="section-card__header">
      <h2>Completed Orders</h2>
    </div>
    <div className="section-card__body">
      {completeOrders.length === 0 ? (
        <div className="empty">No completed orders</div>
      ) : (
        completeOrders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            variant="complete"
            formatCustomerLabel={formatCustomerLabel}
            formatTime={formatTime}
          />
        ))
      )}
    </div>
  </div>
)

export const BotsSection: React.FC<Pick<SectionsProps, 'bots' | 'getOrderById' | 'formatCustomerLabel' | 'formatTime' | 'processingMs' | 'now'>> = ({ bots, getOrderById, formatCustomerLabel, formatTime, processingMs, now }) => (
  <div className="section-card">
    <div className="section-card__header">
      <h2>Bot Status</h2>
    </div>
    <div className="section-card__body">
      {bots.length === 0 ? (
        <div className="empty">No bots added</div>
      ) : (
        bots.map(bot => (
          <BotStatusCard
            key={bot.id}
            bot={bot}
            getOrderById={(id) => getOrderById(id)}
            formatCustomerLabel={formatCustomerLabel}
            formatTime={formatTime}
            processingMs={processingMs}
            now={now}
          />
        ))
      )}
    </div>
  </div>
)
