import type { Order } from '../types';
import OrderCard from './OrderCard';

interface CompleteColumnProps {
  orders: Order[];
}

export default function CompleteColumn({ orders }: CompleteColumnProps) {
  return (
    <div style={{ flex: 1 }}>
      <h2 style={{ borderBottom: '2px solid #4caf50', paddingBottom: '8px', color: '#388e3c' }}>
        COMPLETE ({orders.length})
      </h2>
      {orders.length === 0 ? (
        <p style={{ color: '#999', fontStyle: 'italic' }}>暂无已完成订单</p>
      ) : (
        orders.map((order) => <OrderCard key={order.id} order={order} />)
      )}
    </div>
  );
}
