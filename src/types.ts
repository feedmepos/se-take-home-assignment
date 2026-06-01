export type OrderType = 'VIP' | 'NORMAL'
export type BotStatus = 'IDLE' | 'PROCESSING'

export type Order = {
  id: number
  type: OrderType
}

export type CompletedOrder = Order & {
  completedAt: number
}

export type Bot = {
  id: number
  status: BotStatus
  currentOrder: Order | null
  startedAt: number | null
}

export type State = {
  nextOrderId: number
  nextBotId: number
  pendingOrders: Order[]
  completedOrders: CompletedOrder[]
  bots: Bot[]
}

export type Action =
  | { type: 'ADD_ORDER'; orderType: OrderType }
  | { type: 'ADD_BOT' }
  | { type: 'REMOVE_BOT' }
  | { type: 'PROCESS_TICK'; now: number }

export type RoleTab = 'CUSTOMER' | 'VIP_MEMBER' | 'MANAGER'
