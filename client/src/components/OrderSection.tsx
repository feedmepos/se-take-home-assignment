import { Order } from '../types';
import { OrderCard } from './OrderCard';

interface OrderSectionProps {
  title: string;
  icon: string;
  orders: Order[];
  textColor: string;
}

export function OrderSection({
  title,
  icon,
  orders,
  textColor,
}: OrderSectionProps) {
  return (
    <div className="bg-white shadow-lg p-6 rounded-lg">
      <h3 className={`text-xl font-bold ${textColor} mb-4`}>
        {icon} {title} ({orders.length})
      </h3>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {orders.length === 0 ? (
          <p className="py-8 text-gray-500 text-center">No orders</p>
        ) : (
          orders.map((order) => <OrderCard key={order.id} order={order} />)
        )}
      </div>
    </div>
  );
}
