/**
 * Lifecycle of an order as it flows through the kitchen.
 * PENDING -> PROCESSING (picked up by a bot) -> COMPLETE.
 */
export const OrderStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETE: 'COMPLETE',
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
