// src/components/Controls.tsx
import React from "react";
import { useOrderStore } from "../store/useOrderStore";

export const Controls: React.FC = () => {
  const addOrder = useOrderStore((state) => state.addOrder);
  const addBot = useOrderStore((state) => state.addBot);
  const removeBot = useOrderStore((state) => state.removeBot);

  return (
    <div className="flex flex-wrap gap-4 mb-10 justify-center">
      <button
        className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        onClick={() => addOrder("NORMAL")}
      >
        New Normal Order
      </button>
      <button
        className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
        onClick={() => addOrder("VIP")}
      >
        New VIP Order
      </button>
      <button
        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        onClick={addBot}
      >
        + Bot
      </button>
      <button
        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        onClick={removeBot}
      >
        - Bot
      </button>
    </div>
  );
};
