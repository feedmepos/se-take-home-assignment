import { useOrderStore } from "../store/useOrderStore";

export const CompleteList = () => {
  const orders = useOrderStore((state) => state.orders);

  //  Separate orders into VIP and Normal, filter by COMPLETE status, and sort by ID for consistent display
  const vipCompleted = orders
    .filter((o) => o.status === "COMPLETE" && o.type === "VIP")
    .sort((a, b) => a.id - b.id);

  const normalCompleted = orders
    .filter((o) => o.status === "COMPLETE" && o.type === "NORMAL")
    .sort((a, b) => a.id - b.id);

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-4">COMPLETE</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* VIP Column */}
        <div>
          <h3 className="font-medium mb-3 text-yellow-600 text-center">VIP</h3>

          <div className="flex flex-wrap gap-4 justify-center">
            {vipCompleted.map((order) => (
              <div
                key={order.id}
                className="border p-4 rounded w-40 bg-red-500 text-white hover:bg-red-600"
              >
                <div className="font-bold">{order.displayId}</div>
                <div>Type: {order.type}</div>
              </div>
            ))}

            {vipCompleted.length === 0 && (
              <div className="text-sm text-gray-500">No VIP completed</div>
            )}
          </div>
        </div>

        {/* Normal Column */}
        <div>
          <h3 className="font-medium mb-3 text-gray-600 text-center">Normal</h3>

          <div className="flex flex-wrap gap-4 justify-center">
            {normalCompleted.map((order) => (
              <div
                key={order.id}
                className="border p-4 rounded w-40 bg-yellow-400 text-black hover:bg-yellow-500"
              >
                <div className="font-bold">{order.displayId}</div>
                <div>Type: {order.type}</div>
              </div>
            ))}

            {normalCompleted.length === 0 && (
              <div className="text-sm text-gray-500">No Normal completed</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
