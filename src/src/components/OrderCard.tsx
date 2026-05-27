import type { Order } from '../domain/types'

type OrderCardProps = {
  order: Order
}

/**
 * Presents a single order with visual treatment for VIP versus normal orders.
 *
 * @example
 * <OrderCard order={{ id: 1, type: 'VIP', status: 'PENDING', createdAt: Date.now() }} />
 */
export const OrderCard = ({ order }: OrderCardProps) => {
  const isVip = order.type === 'VIP'

  return (
    <article
      className={[
        'flex min-h-20 items-center justify-between rounded-md border p-4 shadow-sm',
        isVip ? 'border-amber-300 bg-amber-50' : 'border-zinc-200 bg-white',
      ].join(' ')}
      data-testid={`order-${order.id}`}
    >
      <div className="flex items-center gap-3">
        <span
          className={[
            'grid size-10 place-items-center rounded-md font-black text-lg',
            isVip ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-100 text-zinc-700',
          ].join(' ')}
        >
          #{order.id}
        </span>
        <div>
          <h3 className="text-base font-black text-zinc-950">Order #{order.id}</h3>
          <p className="text-sm font-semibold text-zinc-500">{order.type}</p>
        </div>
      </div>
      <span className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-black text-zinc-600">
        {order.status}
      </span>
    </article>
  )
}
