// --------------------------------------------------------------------------
// Domain model — discriminated unions ensure exhaustive handling everywhere.
// Every status transition is a new object; state is never mutated in place.
// --------------------------------------------------------------------------

export type OrderType = 'VIP' | 'NORMAL';

interface BaseOrder {
  readonly id: number;
  readonly type: OrderType;
  readonly createdAt: number; // epoch ms
}

export interface PendingOrder extends BaseOrder {
  readonly status: 'PENDING';
}

export interface ProcessingOrder extends BaseOrder {
  readonly status: 'PROCESSING';
}

export interface CompleteOrder extends BaseOrder {
  readonly status: 'COMPLETE';
  readonly completedAt: number; // epoch ms
}

export type Order = PendingOrder | ProcessingOrder | CompleteOrder;

// --------------------------------------------------------------------------

export interface IdleBot {
  readonly id: number;
  readonly status: 'IDLE';
}

export interface ProcessingBot {
  readonly id: number;
  readonly status: 'PROCESSING';
  readonly currentOrderId: number;
  readonly processingEndsAt: number; // epoch ms — drives the countdown UI
}

export type Bot = IdleBot | ProcessingBot;

// --------------------------------------------------------------------------

/**
 * Immutable view of the controller state emitted after every transition.
 * This is the single thing UI reads; it never exposes mutable internals.
 */
export interface Snapshot {
  readonly pending: readonly PendingOrder[];
  readonly processing: readonly ProcessingOrder[];
  readonly complete: readonly CompleteOrder[];
  readonly bots: readonly Bot[];
}
