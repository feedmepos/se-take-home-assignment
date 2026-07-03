// Shared constants for the order controller.

// Object freeze to prevent accidental mutation of these constants at runtime.

// Time (in milliseconds) a bot takes to process one order.
// Requirement #4: each order requires 10 seconds to complete.
export const PROCESS_MS = 10_000;

// Order types. Lower rank = higher priority in the PENDING queue.
// Requirement #2: VIP orders are processed before Normal orders.
export const OrderType = Object.freeze({
  VIP: 'VIP',
  NORMAL: 'Normal',
});

// Priority rank per type: VIP (0) sorts ahead of Normal (1).
export const TYPE_RANK = Object.freeze({
  [OrderType.VIP]: 0,
  [OrderType.NORMAL]: 1,
});

// Order lifecycle states.
export const OrderStatus = Object.freeze({
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETE: 'COMPLETE',
});

// Bot states.
export const BotStatus = Object.freeze({
  IDLE: 'IDLE',
  PROCESSING: 'PROCESSING',
});
