import { Order } from '../types';

interface OrderCardProps {
  order: Order;
}

export function OrderCard({ order }: OrderCardProps) {
  const statusColors = {
    PENDING: 'bg-yellow-100 border-yellow-300',
    PROCESSING: 'bg-blue-100 border-blue-300',
    COMPLETE: 'bg-green-100 border-green-300',
  };

  const statusTextColors = {
    PENDING: 'text-yellow-800',
    PROCESSING: 'text-blue-800',
    COMPLETE: 'text-green-800',
  };

  const typeColors = {
    NORMAL: 'bg-gray-200 text-gray-800',
    VIP: 'bg-purple-200 text-purple-800',
  };

  return (
    <div className={`border-2 rounded-lg p-4 ${statusColors[order.status]}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="font-bold text-2xl">Order #{order.id}</div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-semibold ${typeColors[order.type]}`}
        >
          {order.type}
        </span>
      </div>
      <div className={`text-sm font-semibold ${statusTextColors[order.status]}`}>
        {order.status}
      </div>
      {order.completedAt && (
        <div className="mt-2 text-gray-600 text-xs">
          Completed: {new Date(order.completedAt).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
