import { OrderStatus } from './order-status';
import { OrderType } from './order-type';

/**
 * A customer order. `id` is unique and monotonically increasing, so it doubles
 * as the creation sequence used to preserve FIFO ordering within a tier.
 */
export interface Order {
  readonly id: number;
  readonly type: OrderType;
  readonly status: OrderStatus;
  readonly completedSeq?: number;
}

export function createOrder(id: number, type: OrderType): Order {
  return { id, type, status: OrderStatus.PENDING };
}
