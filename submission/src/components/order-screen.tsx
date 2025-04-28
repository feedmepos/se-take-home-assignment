"use client";
import { OrderStatus } from "@/constant";
import { OrderCard } from "./order-card";
import { OrderDTO } from "@/models/order";
import useSWR from "swr";

const renderItems = (items: OrderDTO[]) => {
  return items.map((item) => <OrderCard key={item.id} order={item} />);
};

const sortUpdatedAtDesc = (a: OrderDTO, b: OrderDTO) => {
  return b.updated_at.localeCompare(a.updated_at);
};

export function OrderScreen() {
  const res = useSWR<OrderDTO[]>("/api/v1/orders", {
    refreshInterval: 1000,
  });

  const orders = res.data ?? [];
  const [pending, processing, completed] = [
    orders.filter((order) => order.status === OrderStatus.PENDING),
    orders
      .filter((order) => order.status === OrderStatus.PROCESSING)
      .sort(sortUpdatedAtDesc),
    orders
      .filter((order) => order.status === OrderStatus.COMPLETED)
      .sort(sortUpdatedAtDesc),
  ];

  const createOrder = async (isPriority: boolean) => {
    await fetch("/api/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isPriority }),
    });

    await res.mutate();
  };

  const resetData = async () => {
    await fetch("/api/v1/reset", {
      method: "POST",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="space-x-4">
          <button
            onClick={() => createOrder(false)}
            className="cursor-pointer bg-[#FFC72C] hover:bg-yellow-500 text-[#DA291C] font-bold py-2 px-4 rounded"
          >
            Create Normal Order
          </button>
          <button
            onClick={() => createOrder(true)}
            className="cursor-pointer bg-[#DA291C] hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Create VIP Order
          </button>
        </div>
        <div>
          <button
            onClick={() => resetData()}
            className="cursor-pointer bg-black text-white py-2 px-4 rounded"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2">
            Pending ({pending.length})
          </h2>
          <div className="overflow-y-auto h-[400px]">
            {pending.length > 0 ? (
              renderItems(pending)
            ) : (
              <p className="text-gray-500 text-center py-4">
                No pending orders
              </p>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2">
            Processing ({processing.length})
          </h2>
          <div className="overflow-y-auto h-[400px]">
            {processing.length > 0 ? (
              renderItems(processing)
            ) : (
              <p className="text-gray-500 text-center py-4">
                No processing orders
              </p>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2">
            Ready for collection ({completed.length})
          </h2>
          <div className="overflow-y-auto h-[400px]">
            {completed.length > 0 ? (
              renderItems(completed)
            ) : (
              <p className="text-gray-500 text-center py-4">
                No completed orders
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
