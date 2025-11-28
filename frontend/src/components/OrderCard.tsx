import React, { useState } from 'react'

export type CustomerType = 'NORMAL' | 'VIP'
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE'

export interface OrderLite {
  id: number
  customerType: CustomerType
  status: OrderStatus
  createdAt: number
  startedAt?: number
}

interface OrderCardProps {
  order: OrderLite
  variant?: 'pending' | 'complete'
  formatCustomerLabel: (type: CustomerType) => string
  formatTime: (ts?: number) => string
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, variant, formatCustomerLabel, formatTime }) => {
  const [expanded, setExpanded] = useState(false)
  const typeClass = order.customerType === 'VIP' ? 'vip' : 'normal'
  const completeClass = variant === 'complete' ? 'complete' : ''
  const badgeClass = order.customerType === 'VIP'
    ? 'badge vip'
    : (order.status === 'PROCESSING' ? 'badge processing-normal' : 'badge')
  return (
    <div
      className={`order-card ${typeClass} ${completeClass} ${expanded ? 'expanded' : 'collapsed'} toggle`.trim()}
      onClick={() => setExpanded(e => !e)}
      role="button"
      aria-expanded={expanded}
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(x => !x) }}}
    >
      <div className="order-header">
        <span className="order-id">Order #{order.id}</span>
        <span className={badgeClass}>{formatCustomerLabel(order.customerType)}</span>
        <span className="caret" aria-hidden="true" style={{ fontSize: 12, opacity: .6 }}>{expanded ? '▾' : '▸'}</span>
      </div>
      {expanded && (
        <div className="order-body">
          <div>Created: {formatTime(order.createdAt)}</div>
          {variant === 'complete' ? (
            <>
              <div>Started: {formatTime(order.startedAt)}</div>
              <div>Status: {order.status}</div>
            </>
          ) : (
            <div>Status: {order.status}</div>
          )}
        </div>
      )}
    </div>
  )
}
