import React from 'react'

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
  const typeClass = order.customerType === 'VIP' ? 'vip' : 'normal'
  const completeClass = variant === 'complete' ? 'complete' : ''
  return (
    <div className={`order-card ${typeClass} ${completeClass}`.trim()}>
      <div className="order-header">
        <span className="order-id">Order #{order.id}</span>
        <span className="badge">{formatCustomerLabel(order.customerType)}</span>
      </div>
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
    </div>
  )
}
