"use client";

import { useState } from "react";

type OrderStatus = "pending" | "processing" | "completed";

interface Order {
  id: string;
  items: string;
  status: OrderStatus;
  isVIP: boolean;
  createdAt: Date;
}

export default function Home() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [bots, setBots] = useState<number>(0);
  const [orderIdCounter, setOrderIdCounter] = useState<number>(1);

  // Helper function to create a new order
  const createOrder = (isVIP: boolean) => {
    const newOrder: Order = {
      id: `ORD-${orderIdCounter.toString().padStart(4, "0")}`,
      items: `Burger ${isVIP ? "(VIP)" : ""} + Fries + Drink`,
      status: "pending",
      isVIP: isVIP,
      createdAt: new Date(),
    };

    setOrders([...orders, newOrder]);
    setOrderIdCounter(orderIdCounter + 1);
  };

  // Function to add a bot
  const addBot = () => {
    setBots(bots + 1);
  };

  // Function to remove a bot
  const removeBot = () => {
    if (bots > 0) {
      setBots(bots - 1);
    }
  };

  // Filter orders by status
  const pendingOrders = orders.filter((order) => order.status === "pending");
  const processingOrders = orders.filter(
    (order) => order.status === "processing",
  );
  const completedOrders = orders.filter(
    (order) => order.status === "completed",
  );

  // Function to move an order to the next stage
  const progressOrder = (orderId: string) => {
    setOrders(
      orders.map((order) => {
        if (order.id === orderId) {
          if (order.status === "pending") {
            return { ...order, status: "processing" };
          } else if (order.status === "processing") {
            return { ...order, status: "completed" };
          }
        }
        return order;
      }),
    );
  };

  // Helper function to render an order card
  const renderOrderCard = (order: Order) => (
    <div
      key={order.id}
      className={`p-4 mb-2 rounded-lg shadow ${order.isVIP ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"} border`}
    >
      <div className="flex justify-between items-center">
        <span className="font-bold">{order.id}</span>
        {order.isVIP && (
          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
            VIP
          </span>
        )}
      </div>
      <p className="text-sm my-1">{order.items}</p>
      <div className="flex justify-between items-center mt-2">
        <span className="text-xs text-gray-500">
          {order.createdAt.toLocaleTimeString()}
        </span>
        {order.status !== "completed" && (
          <button
            onClick={() => progressOrder(order.id)}
            className="text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded"
          >
            {order.status === "pending" ? "Start" : "Complete"}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto min-h-screen p-4">
      <header className="bg-[#FFC72C] p-4 shadow-md rounded-lg mb-6">
        <h1 className="text-2xl font-bold text-[#DA291C] text-center">
          McDonald&apos;s Order Tracker
        </h1>
      </header>

      <div className="mb-6 flex justify-between items-center">
        <div className="space-x-4">
          <button
            onClick={() => createOrder(false)}
            className="bg-[#DA291C] hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Create Normal Order
          </button>
          <button
            onClick={() => createOrder(true)}
            className="bg-[#FFC72C] hover:bg-yellow-500 text-[#DA291C] font-bold py-2 px-4 rounded"
          >
            Create VIP Order
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <span className="font-bold">Bots: {bots}</span>
          <button
            onClick={addBot}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
          >
            + Bot
          </button>
          <button
            onClick={removeBot}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
            disabled={bots <= 0}
          >
            - Bot
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pending Orders */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2">
            Pending ({pendingOrders.length})
          </h2>
          <div className="overflow-y-auto max-h-[60vh]">
            {pendingOrders.length > 0 ? (
              pendingOrders.map(renderOrderCard)
            ) : (
              <p className="text-gray-500 text-center py-4">
                No pending orders
              </p>
            )}
          </div>
        </div>

        {/* Processing Orders */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2">
            Processing ({processingOrders.length})
          </h2>
          <div className="overflow-y-auto max-h-[60vh]">
            {processingOrders.length > 0 ? (
              processingOrders.map(renderOrderCard)
            ) : (
              <p className="text-gray-500 text-center py-4">
                No processing orders
              </p>
            )}
          </div>
        </div>

        {/* Completed Orders */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2">
            Completed ({completedOrders.length})
          </h2>
          <div className="overflow-y-auto max-h-[60vh]">
            {completedOrders.length > 0 ? (
              completedOrders.map(renderOrderCard)
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
