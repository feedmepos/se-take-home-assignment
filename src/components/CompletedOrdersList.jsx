import { Card } from "antd";

export default function CompletedOrdersList({ orders }) {
  return (
    <Card title="Completed Orders">
      <div className="card-content">
        {orders.map(o => (
          <div key={o.id} className="order-tag completed">
            #{o.id} - {o.customerType}
          </div>
        ))}
      </div>
    </Card>
  );
}