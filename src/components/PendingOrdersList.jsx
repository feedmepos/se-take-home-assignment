import { Card } from "antd";

/**
 * Displays pending orders awaiting processing
 */
export default function PendingOrdersList({ orders }) {
  return (
    <Card title="Pending Orders">
      <div className="card-content">
        {orders.map(order => (
          <div 
            key={order.id} 
            className={`order-tag ${order.customerType.toLowerCase()}`}
          >
            #{order.id} - {order.customerType}
          </div>
        ))}
      </div>
    </Card>
  );
}