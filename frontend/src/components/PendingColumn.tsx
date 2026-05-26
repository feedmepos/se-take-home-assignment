import type { Order } from '../types';
import OrderCard from './OrderCard';

interface PendingColumnProps {
  orders: Order[];
}

export default function PendingColumn({ orders }: PendingColumnProps) {
  return (
    <div style={{ flex: 1 }}>
      <h2 style={{ borderBottom: '2px solid #2196f3', paddingBottom: '8px', color: '#1976d2' }}>
        PENDING ({orders.length})
      </h2>
      {orders.length === 0 ? (
        <p style={{ color: '#999', fontStyle: 'italic' }}>暂无待处理订单</p>
      ) : (
        orders.map((order) => <OrderCard key={order.id} order={order} />)
      )}
    </div>
  );
}
