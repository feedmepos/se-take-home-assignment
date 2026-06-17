import type { Order } from '@/store/types'

export function insertByPriority(pending: Order[], order: Order): void {
  const insertAt = pending.findIndex(o => {
    if (order.type === 'VIP' && o.type === 'NORMAL') return true
    if (order.type === 'NORMAL' && o.type === 'VIP') return false
    return o.id > order.id
  })
  pending.splice(insertAt === -1 ? pending.length : insertAt, 0, order)
}
