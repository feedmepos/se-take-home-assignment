import { Card } from "antd";

export default function PendingOrders({ orders }) {
  return (
    <Card title="Pending Orders">
      <div className="card-content">
        {orders.map(o => (
          <div key={o.id} className={`order-tag ${o.customerType.toLowerCase()}`}>
            #{o.id} - {o.customerType}
          </div>
        ))}
      </div>
    </Card>
  );
}