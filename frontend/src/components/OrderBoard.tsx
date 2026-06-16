import { useOrderContext } from '../hooks/useOrderContext'
import { OrderCard } from './OrderCard'
import { BotCard } from './BotCard'

export function OrderBoard() {
  const { state } = useOrderContext()

  const pendingOrders = state.orders.filter(o => o.status === 'PENDING' || o.status === 'PROCESSING')
  const completeOrders = [...state.orders.filter(o => o.status === 'COMPLETE')].reverse()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {/* Bots column — desktop only (lg+) */}
      <div className="hidden lg:block">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Bots ({state.bots.length})
        </p>
        <div className="flex flex-col gap-2">
          {state.bots.length === 0 ? (
            <p className="text-sm text-gray-400">No bots active</p>
          ) : (
            state.bots.map(bot => (
              <BotCard
                key={bot.id}
                bot={bot}
                processingOrder={state.orders.find(o => o.id === bot.processingOrderId)}
              />
            ))
          )}
        </div>
      </div>

      {/* Pending column */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Pending ({pendingOrders.length})
        </p>
        <div className="flex flex-col gap-2">
          {pendingOrders.length === 0 ? (
            <p className="text-sm text-gray-400">No pending orders</p>
          ) : (
            pendingOrders.map(order => <OrderCard key={order.id} order={order} />)
          )}
        </div>
      </div>

      {/* Complete column */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Complete ({completeOrders.length})
        </p>
        <div className="flex flex-col gap-2">
          {completeOrders.length === 0 ? (
            <p className="text-sm text-gray-400">No completed orders</p>
          ) : (
            completeOrders.map(order => <OrderCard key={order.id} order={order} />)
          )}
        </div>
      </div>
    </div>
  )
}
