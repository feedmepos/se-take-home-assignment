import { Card } from "antd";

/**
 * Displays completed orders
 */
export default function CompletedOrdersList({ orders }) {
  return (
    <Card title="Completed Orders">
      <div className="card-content">
        {orders.map(order => (
          <div 
            key={order.id} 
            className="order-tag completed"
          >
            #{order.id} - {order.customerType}
          </div>
        ))}
      </div>
    </Card>
  );
}