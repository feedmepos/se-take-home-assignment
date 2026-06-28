import { Order } from "../domain/orderController";
import { OrderCard } from "./OrderCard";

interface OrderColumnProps {
  title: string;
  subtitle: string;
  orders: Order[];
  emptyText: string;
}

// 等待区与完成区结构一致，通过数据和文案配置复用同一列组件。
export function OrderColumn({
  title,
  subtitle,
  orders,
  emptyText,
}: OrderColumnProps) {
  return (
    <section className="flow-column">
      <div className="section-heading">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <span>{orders.length}</span>
      </div>
      <div className="order-list">
        {orders.length ? (
          orders.map((order) => <OrderCard key={order.id} order={order} />)
        ) : (
          <p className="empty-copy">{emptyText}</p>
        )}
      </div>
    </section>
  );
}
