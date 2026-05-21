import { memo } from 'react';

const OrderCard = memo(function OrderCard({ order, isCompleted }) {
  return (
    <div className={`order-card ${order.type} ${isCompleted ? 'completed' : ''}`}>
      <div className="order-info">
        <span className="order-id">#{order.id}</span>
        <span className={`order-type ${isCompleted ? 'completed-tag' : order.type}`}>
          {order.type === 'vip' ? 'VIP' : 'Normal'}
        </span>
      </div>
    </div>
  );
});

export default OrderCard;
