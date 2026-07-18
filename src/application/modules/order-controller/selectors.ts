import { Order, OrderStatus, sortByPriority } from '@/domain';
import { ControllerState } from './state';

/** Orders waiting to be cooked, in the exact order bots will pick them up. */
export function selectPending(state: ControllerState): Order[] {
  return sortByPriority(
    state.orders.filter((order) => order.status === OrderStatus.PENDING),
  );
}

/** Orders currently being cooked by a bot. */
export function selectProcessing(state: ControllerState): Order[] {
  return state.orders.filter(
    (order) => order.status === OrderStatus.PROCESSING,
  );
}

/** Completed orders, most recently finished first. */
export function selectComplete(state: ControllerState): Order[] {
  return state.orders
    .filter((order) => order.status === OrderStatus.COMPLETE)
    .sort((a, b) => (b.completedSeq ?? 0) - (a.completedSeq ?? 0));
}
