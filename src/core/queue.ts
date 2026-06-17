// --------------------------------------------------------------------------
// Pure queue helpers — the one place the (VIP, id) invariant lives.
//
// The insight: because order ids are monotonically assigned at creation time,
// sorting by (VIP before NORMAL, then ascending id) satisfies every ordering
// requirement automatically — including "return a cancelled order to its exact
// original slot" — with no index bookkeeping.
// --------------------------------------------------------------------------

import type { PendingOrder } from './types';

/**
 * Comparison function: VIP before NORMAL, then ascending id (FIFO within tier).
 * A single change here is the only cost of adding a new order tier.
 */
export function compareOrders(a: PendingOrder, b: PendingOrder): number {
  if (a.type !== b.type) {
    return a.type === 'VIP' ? -1 : 1;
  }
  return a.id - b.id;
}

/**
 * Returns a new sorted array with `order` inserted at its correct position.
 * Used for both new orders and re-inserting a cancelled order after bot removal.
 */
export function insertOrder(queue: readonly PendingOrder[], order: PendingOrder): PendingOrder[] {
  const next = [...queue, order];
  next.sort(compareOrders);
  return next;
}

/**
 * Returns the front order and the remaining queue, or null if the queue is empty.
 */
export function pickNext(
  queue: readonly PendingOrder[]
): { next: PendingOrder; rest: PendingOrder[] } | null {
  const [next, ...rest] = queue;
  // noUncheckedIndexedAccess: destructured first element may be undefined
  if (next === undefined) return null;
  return { next, rest };
}
