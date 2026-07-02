// Domain types — framework-agnostic, shared by the controller, UI, and tests.

export type OrderType = 'NORMAL' | 'VIP'

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE'

export type BotStatus = 'IDLE' | 'PROCESSING'

export interface Order {
  id: number
  type: OrderType
  status: OrderStatus
  createdAt: number
  startedAt?: number
  completedAt?: number
}

export interface Bot {
  id: number
  status: BotStatus
  currentOrder: Order | null
}

/** Immutable snapshot handed to the UI. `pending` is kept in priority order. */
export interface ControllerState {
  pending: Order[]
  complete: Order[]
  bots: Bot[]
}
