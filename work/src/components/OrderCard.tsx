import { Order } from "../domain/orderController";
import { formatTime } from "../utils/formatTime";

interface OrderCardProps {
  order: Order;
  compact?: boolean;
}

export function OrderCard({ order, compact = false }: OrderCardProps) {
  return (
    <article className={`order-card ${order.type} ${compact ? "compact" : ""}`}>
      <div>
        <h3>订单 #{order.id}</h3>
        <span>{order.type === "vip" ? "VIP" : "普通"}</span>
      </div>
      <p>创建时间 {formatTime(order.createdAt)}</p>
    </article>
  );
}
