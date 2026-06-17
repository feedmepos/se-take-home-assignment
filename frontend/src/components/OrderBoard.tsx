import { useOrderContext } from "../hooks/useOrderContext";
import { OrderCard } from "./OrderCard";
import { BotCard } from "./BotCard";

function ColumnHeader({
  label,
  count,
  badgeClass,
}: {
  label: string;
  count: number;
  badgeClass: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[11px] font-black uppercase tracking-widest text-gray-500">
        {label}
      </span>
      <span
        className={`px-2 py-0.5 rounded-full text-[10px] font-black ${badgeClass}`}
      >
        {count}
      </span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-2xl border-2 border-dashed border-[#EDE8E1] py-8 flex items-center justify-center">
      <p className="text-sm text-gray-300 font-semibold">{message}</p>
    </div>
  );
}

export function OrderBoard() {
  const { state } = useOrderContext();

  const pendingOrders = state.orders
    .filter((o) => o.status === "PENDING" || o.status === "PROCESSING")
    .sort((a, b) => {
      if (a.type === b.type) return 0;
      return a.type === "VIP" ? -1 : 1;
    });

  // filter() already returns a new array; reverse() is safe without spread
  const completeOrders = state.orders
    .filter((o) => o.status === "COMPLETE")
    .reverse();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {/* Bots column — desktop only */}
      <div className="hidden lg:block">
        <ColumnHeader
          label="bots"
          count={state.bots.length}
          badgeClass="bg-mcd-black text-white"
        />
        <div className="flex flex-col gap-2">
          {state.bots.length === 0 ? (
            <EmptyState message="No bots active" />
          ) : (
            state.bots.map((bot) => (
              <BotCard
                key={bot.id}
                bot={bot}
                processingOrder={state.orders.find(
                  (o) => o.id === bot.processingOrderId,
                )}
              />
            ))
          )}
        </div>
      </div>

      {/* Pending column */}
      <div>
        <ColumnHeader
          label="pending"
          count={pendingOrders.length}
          badgeClass="bg-mcd-gold text-mcd-black"
        />
        <div className="flex flex-col gap-2">
          {pendingOrders.length === 0 ? (
            <EmptyState message="No orders queued" />
          ) : (
            pendingOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))
          )}
        </div>
      </div>

      {/* Complete column */}
      <div>
        <ColumnHeader
          label="complete"
          count={completeOrders.length}
          badgeClass="bg-green-500 text-white"
        />
        <div className="flex flex-col gap-2">
          {completeOrders.length === 0 ? (
            <EmptyState message="No completed orders" />
          ) : (
            completeOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
