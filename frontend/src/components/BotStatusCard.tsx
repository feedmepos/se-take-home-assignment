import React from 'react'
import type { CustomerType, OrderStatus } from './OrderCard'

export interface BotStatusCardProps {
  bot: { id: number; status: 'IDLE' | 'PROCESSING'; currentOrderId?: number }
  getOrderById: (id: number) => { id: number; customerType: CustomerType; status: OrderStatus; createdAt: number; startedAt?: number } | undefined
  formatCustomerLabel: (type: CustomerType) => string
  formatTime: (ts?: number) => string
  processingMs: number
  now: number
}

export const BotStatusCard: React.FC<BotStatusCardProps> = ({ bot, getOrderById, formatCustomerLabel, formatTime, processingMs, now }) => {
  const currentOrder = bot.currentOrderId != null ? getOrderById(bot.currentOrderId) : undefined
  let progressPct = 0
  let elapsedSec = 0
  if (bot.status === 'PROCESSING' && currentOrder?.startedAt) {
    const elapsedMs = now - currentOrder.startedAt
    progressPct = Math.min(100, (elapsedMs / processingMs) * 100)
    elapsedSec = elapsedMs / 1000
  }
  return (
    <div className="bot-card">
      <div className="order-header">
        <span className="order-id">Bot #{bot.id}</span>
        {bot.status === 'PROCESSING' && currentOrder && (
          <span className={currentOrder.customerType === 'VIP' ? 'badge vip' : 'badge'}>
            {formatCustomerLabel(currentOrder.customerType)}
          </span>
        )}
        <span className={`badge ${bot.status === 'IDLE' ? 'idle' : 'processing'}`}>{bot.status}</span>
      </div>
      <div className="order-body">
        {bot.status === 'PROCESSING' && currentOrder ? (
          <>
            <div>
              Processing: <strong>Order #{currentOrder.id}</strong>
            </div>
            <div>Started: {currentOrder.startedAt ? formatTime(currentOrder.startedAt) : '-'}</div>
            <div className="progress-wrapper">
              <div className="progress-bar" style={{ width: `${progressPct}%` }} />
            </div>
            <div>Elapsed: {elapsedSec.toFixed(1)}s / {(processingMs / 1000)}s</div>
          </>
        ) : (
          <div>Bot is idle and waiting for orders.</div>
        )}
      </div>
    </div>
  )
}
