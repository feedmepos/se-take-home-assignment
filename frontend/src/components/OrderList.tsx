import React from "react";
import { useOrderStore, type Order } from "../store/useOrderStore";

export const OrderList: React.FC = () => {
  const { vipQueue, normalQueue, orders } = useOrderStore();

  const pendingOrders = [...vipQueue, ...normalQueue]
    .map((id) => orders.find((o) => o.id === id))
    .filter((o): o is Order => o !== undefined);

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-2">PENDING</h2>
      <div className="flex flex-wrap gap-4 justify-center">
        {pendingOrders.map((order) => (
          <div
            key={order.id}
            className={`border p-4 rounded w-40 text-black ${
              order.type === "VIP" ? "bg-yellow-200" : "bg-gray-200"
            }`}
          >
            <div className="font-bold">{order.displayId}</div>
            <div>Type: {order.type}</div>
          </div>
        ))}
        {pendingOrders.length === 0 && <div>No pending orders</div>}
      </div>
    </div>
  );
};
