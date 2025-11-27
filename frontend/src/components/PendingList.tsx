import React from 'react'
import { Order } from '../types'

export const PendingList: React.FC<{ orders: Order[] }> = ({ orders }) => (
  orders.length > 0 ? (
    <ul>
      {orders.map((o) => (
        <li key={o.id}>
          <span className={`badge ${o.type === 'VIP' ? 'badge-vip' : 'badge-normal'}`}>{o.type}</span>
          {' '}#{o.id}
        </li>
      ))}
    </ul>
  ) : (
    <p className="empty">No pending orders</p>
  )
)
