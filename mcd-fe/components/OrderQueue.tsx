'use client';

import type { Order } from '@/types/order';
import { Order as OrderComponent } from './Order';

interface OrderQueueProps {
  title: string;
  orders: Order[];
  emptyMessage: string;
  borderColor: string;
}

export function OrderQueue({ title, orders, emptyMessage, borderColor }: OrderQueueProps) {
  return (
    <div className={`flex-1 min-h-0 border-4 ${borderColor} rounded-xl p-4 bg-white`}>
      <h2 className="text-xl font-bold mb-4 text-gray-800">{title}</h2>
      <div className="space-y-2 overflow-y-auto max-h-96">
        {orders.length === 0 ? (
          <div className="text-gray-400 text-center py-8">{emptyMessage}</div>
        ) : (
          orders.map(order => (
            <OrderComponent key={order.id} order={order} />
          ))
        )}
      </div>
      <div className="mt-4 text-sm text-gray-600">
        Total: {orders.length} orders
      </div>
    </div>
  );
}
