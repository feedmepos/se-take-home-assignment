import type { Order } from '../types'

export function insertVipOrder(pending: Order[], order: Order): Order[] {
  const lastVipIndex = pending.reduce(
    (last, o, i) => (o.type === 'vip' ? i : last),
    -1,
  )
  const next = [...pending]
  next.splice(lastVipIndex + 1, 0, order)
  return next
}

export function insertNormalOrder(pending: Order[], order: Order): Order[] {
  return [...pending, order]
}

export function restoreOrder(pending: Order[], order: Order): Order[] {
  const next = [...pending, order]
  next.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'vip' ? -1 : 1
    return a.id - b.id
  })
  return next
}
