import { Order } from './order';
import { OrderType } from './order-type';

/**
 * Ordering priority: VIP orders come before Normal orders. Lower number wins.
 */
const typeRank: Record<OrderType, number> = {
  [OrderType.VIP]: 0,
  [OrderType.NORMAL]: 1,
};

/**
 * The single source of truth for queue ordering.
 */
export function compareOrders(a: Order, b: Order): number {
  const byType = typeRank[a.type] - typeRank[b.type];
  if (byType !== 0) return byType;
  return a.id - b.id;
}

/** Return a new array sorted by serving priority. */
export function sortByPriority(orders: readonly Order[]): Order[] {
  return [...orders].sort(compareOrders);
}
