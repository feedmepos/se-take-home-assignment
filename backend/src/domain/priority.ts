import { Order, OrderType } from './types';
const TIER_RANK: Record<OrderType, number> = { VIP: 0, NORMAL: 1 };
export function compareOrders(a: Order, b: Order): number {
  return TIER_RANK[a.type] - TIER_RANK[b.type] || a.id - b.id;
}
