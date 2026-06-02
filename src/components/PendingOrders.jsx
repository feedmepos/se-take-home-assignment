import OrderCard from './OrderCard'

export default function PendingOrders({ orders }) {
  return (
    <div className="flex flex-col rounded-xl bg-white p-4 shadow max-h-[60vh]">
      <h2 className="mb-3 text-lg font-bold text-gray-800">PENDING</h2>
      {orders.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No pending orders</p>
      ) : (
        <div className="flex flex-col gap-2 overflow-y-auto">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}
