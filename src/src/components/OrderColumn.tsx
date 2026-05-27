import type { Order } from '../domain/types'
import { OrderCard } from './OrderCard'

type OrderColumnProps = {
  title: 'PENDING' | 'COMPLETE'
  orders: Order[]
}

/**
 * Shows one order lane with a count badge and an empty state.
 *
 * @example
 * <OrderColumn title="PENDING" orders={pendingOrders} />
 */
export const OrderColumn = ({ title, orders }: OrderColumnProps) => {
  return (
    <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-zinc-950">{title}</h2>
        </div>
        <span
          className="rounded-md bg-white px-2.5 py-1 text-sm font-black text-zinc-700 shadow-sm"
          data-testid={`${title.toLowerCase()}-count`}
        >
          {orders.length}
        </span>
      </div>

      <div className="mt-4 grid gap-3" data-testid={`${title.toLowerCase()}-orders`}>
        {orders.length > 0 ? (
          orders.map((order) => <OrderCard key={order.id} order={order} />)
        ) : (
          <div className="grid min-h-32 place-items-center rounded-md border border-dashed border-zinc-300 bg-white text-sm font-semibold text-zinc-400">
            Empty
          </div>
        )}
      </div>
    </section>
  )
}
