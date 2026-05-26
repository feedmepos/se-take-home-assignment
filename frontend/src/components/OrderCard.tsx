import type { Order } from '../types';

interface OrderCardProps {
  order: Order;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toTimeString().slice(0, 8);
}

export default function OrderCard({ order }: OrderCardProps) {
  const isVip = order.type === 'VIP';
  return (
    <div
      style={{
        border: `2px solid ${isVip ? '#ff9800' : '#ddd'}`,
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '8px',
        background: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div>
        <strong style={{ fontSize: '16px' }}>Order-{order.id}</strong>
        <span
          style={{
            marginLeft: '8px',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            background: isVip ? '#fff3e0' : '#f5f5f5',
            color: isVip ? '#e65100' : '#666',
          }}
        >
          {order.type}
        </span>
      </div>
      <div style={{ fontSize: '13px', color: '#888' }}>
        {order.completedAt ? `完成于 ${formatTime(order.completedAt)}` : `创建于 ${formatTime(order.createdAt)}`}
      </div>
    </div>
  );
}
