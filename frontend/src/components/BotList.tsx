import React from "react";
import { useOrderStore } from "../store/useOrderStore";

export const BotList: React.FC = () => {
  const bots = useOrderStore((state) => state.bots);
  const orders = useOrderStore((state) => state.orders);

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-2">Bots</h2>
      <div className="flex flex-wrap gap-4 justify-center">
        {bots.map((bot) => {
          const currentOrder = orders.find((o) => o.id === bot.currentOrderId);

          return (
            <div
              key={bot.id}
              className={`border p-4 rounded w-48 text-white ${
                bot.status === "BUSY" ? "bg-gray-700" : "bg-green-600"
              }`}
            >
              <div className="font-bold">Bot {bot.id}</div>
              <div>Status: {bot.status}</div>
              <div>
                Processing: {currentOrder ? `#${currentOrder.id}` : "-"}
              </div>
            </div>
          );
        })}

        {bots.length === 0 && <div>No bots</div>}
      </div>
    </div>
  );
};
