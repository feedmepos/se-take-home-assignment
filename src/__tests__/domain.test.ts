import { describe, it, expect } from 'vitest'
import { COOKING_TIME_MS } from '../config'
import {
  sortPending, tick, roleToUserId,
  ORDER_TYPE, ORDER_STATUS, BOT_STATUS, ROLE,
  type Order, type Bot,
} from '../domain'

function makeOrder(overrides: Partial<Order> = {}): Order {
  return { id: 1, type: ORDER_TYPE.NORMAL, status: ORDER_STATUS.PENDING, placedBy: ROLE.MANAGER, userId: 0, createdAt: 1000, ...overrides }
}

function makeBot(overrides: Partial<Bot> = {}): Bot {
  return { id: 1, status: BOT_STATUS.IDLE, orderId: null, startedAt: null, createdAt: 1000, ...overrides }
}

describe('sortPending', () => {
  it('returns empty for empty input', () => {
    expect(sortPending([])).toEqual([])
  })

  it('returns only pending orders', () => {
    const orders = [
      makeOrder({ id: 1, status: ORDER_STATUS.PENDING }),
      makeOrder({ id: 2, status: ORDER_STATUS.COMPLETED }),
      makeOrder({ id: 3, status: ORDER_STATUS.PROCESSING }),
    ]
    const result = sortPending(orders)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
  })

  it('puts VIP before normal', () => {
    const orders = [
      makeOrder({ id: 1, type: ORDER_TYPE.NORMAL, createdAt: 1000 }),
      makeOrder({ id: 2, type: ORDER_TYPE.VIP, createdAt: 2000 }),
    ]
    const result = sortPending(orders)
    expect(result[0].type).toBe(ORDER_TYPE.VIP)
    expect(result[1].type).toBe(ORDER_TYPE.NORMAL)
  })

  it('stable within same type by createdAt', () => {
    const orders = [
      makeOrder({ id: 1, type: ORDER_TYPE.NORMAL, createdAt: 3000 }),
      makeOrder({ id: 2, type: ORDER_TYPE.NORMAL, createdAt: 1000 }),
      makeOrder({ id: 3, type: ORDER_TYPE.NORMAL, createdAt: 2000 }),
    ]
    const result = sortPending(orders)
    expect(result.map((o) => o.id)).toEqual([2, 3, 1])
  })

  it('VIP stable by createdAt among themselves', () => {
    const orders = [
      makeOrder({ id: 1, type: ORDER_TYPE.VIP, createdAt: 3000 }),
      makeOrder({ id: 2, type: ORDER_TYPE.VIP, createdAt: 1000 }),
    ]
    const result = sortPending(orders)
    expect(result.map((o) => o.id)).toEqual([2, 1])
  })

  it('mixed VIP and normal - VIP first by creation order', () => {
    const orders = [
      makeOrder({ id: 1, type: ORDER_TYPE.NORMAL, createdAt: 1000 }),
      makeOrder({ id: 2, type: ORDER_TYPE.VIP, createdAt: 2000 }),
      makeOrder({ id: 3, type: ORDER_TYPE.NORMAL, createdAt: 3000 }),
      makeOrder({ id: 4, type: ORDER_TYPE.VIP, createdAt: 4000 }),
    ]
    const result = sortPending(orders)
    expect(result.map((o) => o.id)).toEqual([2, 4, 1, 3])
  })
})

describe('roleToUserId', () => {
  it('maps manager to 0', () => expect(roleToUserId(ROLE.MANAGER)).toBe(0))
  it('maps normal customer to 1', () => expect(roleToUserId(ROLE.NORMAL_CUSTOMER)).toBe(1))
  it('maps vip customer to 2', () => expect(roleToUserId(ROLE.VIP_CUSTOMER)).toBe(2))
})

describe('tick', () => {
  it('completes timed-out order and sets bot idle', () => {
    const order: Order = makeOrder({ id: 1, status: ORDER_STATUS.PROCESSING })
    const bot: Bot = makeBot({ id: 1, status: BOT_STATUS.PROCESSING, orderId: 1, startedAt: 0 })
    const result = tick([order], [bot], COOKING_TIME_MS)
    expect(result.completedOrders).toEqual([1])
    expect(order.status).toBe(ORDER_STATUS.COMPLETED)
    expect(order.completedAt).toBe(COOKING_TIME_MS)
    expect(bot.status).toBe(BOT_STATUS.IDLE)
    expect(bot.orderId).toBeNull()
    expect(bot.startedAt).toBeNull()
  })

  it('does not complete order before cooking time', () => {
    const order: Order = makeOrder({ id: 1, status: ORDER_STATUS.PROCESSING })
    const bot: Bot = makeBot({ id: 1, status: BOT_STATUS.PROCESSING, orderId: 1, startedAt: 0 })
    const result = tick([order], [bot], COOKING_TIME_MS - 1)
    expect(result.completedOrders).toEqual([])
    expect(order.status).toBe(ORDER_STATUS.PROCESSING)
  })

  it('idle bot picks pending order', () => {
    const order: Order = makeOrder({ id: 1, status: ORDER_STATUS.PENDING })
    const bot: Bot = makeBot({ id: 1, status: BOT_STATUS.IDLE })
    const result = tick([order], [bot], 5000)
    expect(result.startedOrders).toEqual([1])
    expect(order.status).toBe(ORDER_STATUS.PROCESSING)
    expect(bot.status).toBe(BOT_STATUS.PROCESSING)
    expect(bot.orderId).toBe(1)
    expect(bot.startedAt).toBe(5000)
  })

  it('does not pick if no pending orders', () => {
    const bot: Bot = makeBot({ id: 1, status: BOT_STATUS.IDLE })
    const result = tick([], [bot], 5000)
    expect(result.startedOrders).toEqual([])
    expect(bot.status).toBe(BOT_STATUS.IDLE)
  })

  it('bot picks VIP before normal', () => {
    const vip: Order = makeOrder({ id: 1, type: ORDER_TYPE.VIP, status: ORDER_STATUS.PENDING, createdAt: 2000 })
    const normal: Order = makeOrder({ id: 2, type: ORDER_TYPE.NORMAL, status: ORDER_STATUS.PENDING, createdAt: 1000 })
    const bot: Bot = makeBot({ id: 1, status: BOT_STATUS.IDLE })
    const result = tick([normal, vip], [bot], 5000)
    expect(result.startedOrders).toEqual([1])
    expect(vip.status).toBe(ORDER_STATUS.PROCESSING)
    expect(normal.status).toBe(ORDER_STATUS.PENDING)
  })

  it('completes and picks next in same tick', () => {
    const order1: Order = makeOrder({ id: 1, status: ORDER_STATUS.PROCESSING, createdAt: 0 })
    const order2: Order = makeOrder({ id: 2, status: ORDER_STATUS.PENDING, createdAt: 5000 })
    const bot: Bot = makeBot({ id: 1, status: BOT_STATUS.PROCESSING, orderId: 1, startedAt: 0 })
    const result = tick([order1, order2], [bot], COOKING_TIME_MS)
    expect(result.completedOrders).toEqual([1])
    expect(result.startedOrders).toEqual([2])
    expect(order1.status).toBe(ORDER_STATUS.COMPLETED)
    expect(order2.status).toBe(ORDER_STATUS.PROCESSING)
  })
})
