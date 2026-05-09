"use client";

import type { Order } from "../types";

type Variant = "pending" | "complete";

const formatDateTime = (d: Date) => {
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "short" });
  const year = d.getFullYear();
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  return `${day} ${month} ${year}, ${time}`;
};

function OrderCard({ order, variant }: { order: Order; variant: Variant }) {
  const time = variant === "complete" && order.completedAt ? order.completedAt : order.createdAt;
  return (
    <div className={`order-card ${order.type} ${variant}`}>
      <div className="order-info">
        <span className="order-number">#{order.id}</span>
        {variant === "complete" && <span className="order-badge badge-complete">✓ Complete</span>}
        <span className={`order-badge ${order.type === "vip" ? "badge-vip" : "badge-normal"}`}>
          {order.type === "vip" ? "👑 VIP" : "Normal"}
        </span>
      </div>
      <div className="order-meta">
        <span className="order-time">{formatDateTime(time)}</span>
      </div>
    </div>
  );
}

function Board({ title, variant, orders, emptyText }: {
  title: string;
  variant: Variant;
  orders: Order[];
  emptyText: string;
}) {
  return (
    <div className="board">
      <div className={`board-header ${variant}-header`}>
        <div className="board-title">
          <span className={`board-dot ${variant}-dot`} />
          <h2>{title}</h2>
        </div>
        <span className="board-count">{orders.length}</span>
      </div>
      <div className="board-body">
        {orders.length === 0 ? (
          <div className="empty-state">{emptyText}</div>
        ) : (
          orders.map((o) => <OrderCard key={o.id} order={o} variant={variant} />)
        )}
      </div>
    </div>
  );
}

export function OrderBoards({ pendingOrders, completeOrders }: {
  pendingOrders: Order[];
  completeOrders: Order[];
}) {
  return (
    <main className="boards">
      <Board title="PENDING" variant="pending" orders={pendingOrders} emptyText="No pending orders" />
      <Board
        title="COMPLETE"
        variant="complete"
        orders={[...completeOrders].reverse()}
        emptyText="No completed orders"
      />
    </main>
  );
}
