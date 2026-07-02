/**
 * Domain types for the McDonald's automated cooking-bot order controller.
 * Pure data — no React, no DOM. This module is the single source of truth
 * for the shapes the UI and the tests both rely on.
 */

export type OrderType = 'NORMAL' | 'VIP'

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE'

export type BotStatus = 'IDLE' | 'PROCESSING'

export interface Order {
  /** Unique, monotonically increasing order number. */
  id: number
  type: OrderType
  status: OrderStatus
  /** Epoch ms when the order was created. */
  createdAt: number
  /** Epoch ms when a bot began processing (set on pickup, cleared on requeue). */
  startedAt?: number
  /** Epoch ms when the order moved to COMPLETE. */
  completedAt?: number
}

export interface Bot {
  /** Unique, monotonically increasing bot number. */
  id: number
  status: BotStatus
  /** The order this bot is currently cooking, or null when IDLE. */
  currentOrder: Order | null
}

/**
 * An immutable snapshot of the whole system, handed to the UI on every change.
 * `pending` is always kept in priority order (all VIP before all NORMAL,
 * FIFO within each group), so the front of the array is always the next job.
 */
export interface ControllerState {
  pending: Order[]
  complete: Order[]
  bots: Bot[]
}
