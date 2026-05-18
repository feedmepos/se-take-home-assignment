'use client';

import type { Order } from '@/types/order';

interface OrderProps {
  order: Order;
}

export function Order({ order }: OrderProps) {
  const getBackgroundColor = () => {
    if (order.type === 'VIP') {
      return 'bg-purple-100 border-purple-300';
    }
    return 'bg-blue-100 border-blue-300';
  };

  const getTextColor = () => {
    if (order.type === 'VIP') {
      return 'text-purple-800';
    }
    return 'text-blue-800';
  };

  return (
    <div className={`px-4 py-3 rounded-lg border-2 ${getBackgroundColor()} ${getTextColor()} transition-all duration-300`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg">#{order.id}</span>
          {order.type === 'VIP' && (
            <span className="px-2 py-1 bg-purple-200 text-purple-900 text-xs font-semibold rounded">
              VIP
            </span>
          )}
        </div>
        <div className="text-sm opacity-75">
          {new Date(order.createdAt).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
