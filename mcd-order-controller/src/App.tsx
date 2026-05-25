import { useOrderController } from "./useOrderController";
import type { Order } from "./types";

function App() {
  const {
    pendingOrders,
    processingOrders,
    completedOrders,
    bots,
    createOrder,
    addBot,
    removeBot,
  } = useOrderController();

  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">
          McDonald's Order Controller
        </h1>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => createOrder("NORMAL")}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg"
          >
            New Normal Order
          </button>

          <button
            onClick={() => createOrder("VIP")}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg"
          >
            New VIP Order
          </button>

          <button
            onClick={addBot}
            className="px-4 py-2 bg-green-500 text-white rounded-lg"
          >
            + Bot
          </button>

          <button
            onClick={removeBot}
            className="px-4 py-2 bg-red-500 text-white rounded-lg"
          >
            - Bot
          </button>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">
            Bots ({bots.length})
          </h2>

          <div className="grid grid-cols-3 gap-4">
            {bots.map((bot) => (
              <div
                key={bot.id}
                className="bg-white p-4 rounded-xl shadow"
              >
                <h3 className="font-bold">
                  Bot #{bot.id}
                </h3>

                <p>
                  Status:{" "}
                  {bot.processingOrder
                    ? "PROCESSING"
                    : "IDLE"}
                </p>

                {bot.processingOrder && (
                  <p>
                    Order #{bot.processingOrder.id}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <Section
            title="Pending Orders"
            orders={pendingOrders}
          />

          <Section
            title="Processing Orders"
            orders={processingOrders}
          />

          <Section
            title="Completed Orders"
            orders={completedOrders}
          />
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  orders,
}: {
  title: string;
  orders: Order[];
}) {
  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <h2 className="text-2xl font-bold mb-4">
        {title}
      </h2>

      <div className="space-y-3">
        {orders.map((order, index) => (
          <div
            key={`${title}-${order.id}-${index}`}
            className={`p-3 rounded-lg text-white font-bold ${
              order.type === "VIP"
                ? "bg-yellow-500"
                : "bg-blue-500"
            }`}
          >
            #{order.id} - {order.type}
          </div>
        ))}

        {orders.length === 0 && (
          <p className="text-gray-400">
            No orders
          </p>
        )}
      </div>
    </div>
  );
}

export default App;