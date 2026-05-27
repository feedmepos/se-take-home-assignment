import { COOKING_TIME_MS } from './config'

// ─── Types ───────────────────────────────────────────────

export type OrderType = 'normal' | 'vip'
export type OrderStatus = 'pending' | 'processing' | 'completed'
export type BotStatus = 'idle' | 'processing'
export type Role = 'normal-customer' | 'vip-customer' | 'manager'
export type PlacedBy = Role

export const ORDER_TYPE = {
  NORMAL: 'normal' as OrderType,
  VIP: 'vip' as OrderType,
} as const

export const ORDER_STATUS = {
  PENDING: 'pending' as OrderStatus,
  PROCESSING: 'processing' as OrderStatus,
  COMPLETED: 'completed' as OrderStatus,
} as const

export const BOT_STATUS = {
  IDLE: 'idle' as BotStatus,
  PROCESSING: 'processing' as BotStatus,
} as const

export const ROLE = {
  NORMAL_CUSTOMER: 'normal-customer' as Role,
  VIP_CUSTOMER: 'vip-customer' as Role,
  MANAGER: 'manager' as Role,
} as const

/** MVP mock: 0=经理, 1=普通用户, 2=VIP用户 */
export function roleToUserId(role: Role): number {
  switch (role) {
    case ROLE.MANAGER: return 0
    case ROLE.NORMAL_CUSTOMER: return 1
    case ROLE.VIP_CUSTOMER: return 2
  }
}

export interface Order {
  id: number
  type: OrderType
  status: OrderStatus
  placedBy: PlacedBy
  userId: number  // MVP mock: 0=经理, 1=普通用户, 2=VIP用户
  createdAt: number // unix ms
  completedAt?: number // unix ms, 完成时写入
}

export interface Bot {
  id: number
  status: BotStatus
  orderId: number | null
  startedAt: number | null // unix ms
  createdAt: number
}

// ─── Port（数据存储抽象，纯异步接口）─────────────

export interface IDataPort {
  getOrders(): Promise<Order[]>
  getBots(): Promise<Bot[]>
  getNextOrderId(): Promise<number>
  getNextBotId(): Promise<number>
  addOrder(order: Order): Promise<void>
  removeOrder(id: number): Promise<void>
  updateOrder(id: number, patch: Partial<Order>): Promise<void>
  addBot(bot: Bot): Promise<void>
  removeBot(id: number): Promise<void>
  updateBot(id: number, patch: Partial<Bot>): Promise<void>
}

// ─── Pure Functions ─────────────────────────────────

/** 对 pending 订单排序：VIP 优先，同类型按 createdAt 升序 */
export function sortPending(orders: Order[]): Order[] {
  return [...orders]
    .filter((o) => o.status === ORDER_STATUS.PENDING)
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === ORDER_TYPE.VIP ? -1 : 1
      return a.createdAt - b.createdAt
    })
}

/**
 * tick：处理超时订单 + 空闲 Bot 接单。
 * 直接操作传入的 orders/bots 对象引用（原地修改）。
 */
export function tick(orders: Order[], bots: Bot[], now: number): { completedOrders: number[]; startedOrders: number[] } {
  const completed: number[] = []
  const started: number[] = []

  for (const bot of bots) {
    if (bot.status === BOT_STATUS.PROCESSING && bot.startedAt !== null && now - bot.startedAt >= COOKING_TIME_MS) {
      completed.push(bot.orderId!)
      const order = orders.find((o) => o.id === bot.orderId)
      if (order) {
        order.status = ORDER_STATUS.COMPLETED
        order.completedAt = now
      }
      bot.status = BOT_STATUS.IDLE
      bot.orderId = null
      bot.startedAt = null
    }
  }

  const pending = sortPending(orders)
  for (const bot of bots) {
    if (bot.status === BOT_STATUS.IDLE && pending.length > 0) {
      const order = pending.shift()!
      order.status = ORDER_STATUS.PROCESSING
      bot.status = BOT_STATUS.PROCESSING
      bot.orderId = order.id
      bot.startedAt = now
      started.push(order.id)
    }
  }

  return { completedOrders: completed, startedOrders: started }
}
