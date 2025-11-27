import React from 'react'
import { Order } from '../types'
import { formatTime } from '../utils/time'

export const CompletedList: React.FC<{ orders: Order[] }> = ({ orders }) => (
  orders.length > 0 ? (
    <ul>
      {orders.map((o: Order) => (
        <li key={o.id}>#{o.id} {o.type} - {o.completedAt ? formatTime(new Date(o.completedAt)) : formatTime()}</li>
      ))}
    </ul>
  ) : (
    <p className="empty">No completed orders yet</p>
  )
)
