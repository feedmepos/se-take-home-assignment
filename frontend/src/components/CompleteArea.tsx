import React from 'react';
import type { Order } from '../types';
import { CheckCircle2, Star } from 'lucide-react';

interface CompleteAreaProps {
  orders: Order[];
}

export const CompleteArea: React.FC<CompleteAreaProps> = ({ orders }) => {
  const completeOrders = orders
    .filter((o) => o.status === 'COMPLETE')
    .sort((a, b) => b.id - a.id); // Newest completed at top

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">
          <CheckCircle2 size={24} className="text-green-400" />
          COMPLETE
        </h2>
      </div>
      
      {completeOrders.length === 0 ? (
        <div className="empty-state">
          <CheckCircle2 size={48} />
          <p>No completed orders yet</p>
        </div>
      ) : (
        <div className="order-list">
          {completeOrders.map((order) => (
            <div key={order.id} className={`order-card ${order.type === 'VIP' ? 'vip' : ''}`}>
              <div className="order-info">
                <span className="order-id">Order #{order.id}</span>
                <span className={`order-type ${order.type === 'VIP' ? 'vip-text' : ''}`}>
                  {order.type === 'VIP' && <Star size={14} />}
                  {order.type}
                </span>
              </div>
              <CheckCircle2 size={20} color="#10b981" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
