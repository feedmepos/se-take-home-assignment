import React from 'react';
import type { Order } from '../types';
import { ClipboardList, Star } from 'lucide-react';

interface PendingAreaProps {
  orders: Order[];
}

export const PendingArea: React.FC<PendingAreaProps> = ({ orders }) => {
  // Extract and sort pending orders based on VIP priority
  const pendingOrders = orders
    .filter((o) => o.status === 'PENDING')
    .sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'VIP' ? -1 : 1;
      }
      return a.id - b.id;
    });

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">
          <ClipboardList size={24} className="text-blue-400" />
          PENDING
        </h2>
      </div>
      
      {pendingOrders.length === 0 ? (
        <div className="empty-state">
          <ClipboardList size={48} />
          <p>No pending orders</p>
        </div>
      ) : (
        <div className="order-list">
          {pendingOrders.map((order) => (
            <div key={order.id} className={`order-card ${order.type === 'VIP' ? 'vip' : ''}`}>
              <div className="order-info">
                <span className="order-id">Order #{order.id}</span>
                <span className={`order-type ${order.type === 'VIP' ? 'vip-text' : ''}`}>
                  {order.type === 'VIP' && <Star size={14} />}
                  {order.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
