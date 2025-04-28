"use client";
import { OrderStatus } from "@/constant";
import { OrderDTO } from "@/models/order";

type OrderCardProps = {
  order: OrderDTO;
};

export function OrderCard({ order }: OrderCardProps) {
  return (
    <div
      className={`p-2 mb-2 rounded-lg shadow ${order.is_priority ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"} border`}
    >
      <div className="flex justify-between items-center">
        <span className="font-bold"># {order.id}</span>
        {order.status === OrderStatus.PROCESSING
          ? `(by Bot ${order.assigned_bot_id})`
          : null}
      </div>
    </div>
  );
}
