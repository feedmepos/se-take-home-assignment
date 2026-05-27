import { describe, it, expect, beforeEach } from 'vitest'
import { COOKING_TIME_MS } from '../config'
import { ORDER_TYPE, ORDER_STATUS, BOT_STATUS, ROLE } from '../domain'
import { createKitchenStore } from '../store'
import { InMemoryPort } from '../infrastructure'

function createStore() {
  return createKitchenStore(new InMemoryPort())
}

describe('KitchenStore', () => {
  let store: ReturnType<typeof createStore>

  beforeEach(() => {
    store = createStore()
  })

  it('starts empty', () => {
    const s = store.getState()
    expect(s.orders).toEqual([])
    expect(s.bots).toEqual([])
  })

  it('adds normal order', async () => {
    await store.getState().addNormalOrder(ROLE.NORMAL_CUSTOMER)
    const orders = store.getState().orders
    expect(orders).toHaveLength(1)
    expect(orders[0].type).toBe(ORDER_TYPE.NORMAL)
    expect(orders[0].status).toBe(ORDER_STATUS.PENDING)
    expect(orders[0].id).toBe(1)
  })

  it('adds VIP order', async () => {
    await store.getState().addVipOrder(ROLE.VIP_CUSTOMER)
    const orders = store.getState().orders
    expect(orders).toHaveLength(1)
    expect(orders[0].type).toBe(ORDER_TYPE.VIP)
    expect(orders[0].id).toBe(1)
  })

  it('order ids are unique and increasing', async () => {
    await store.getState().addNormalOrder(ROLE.NORMAL_CUSTOMER)
    await store.getState().addVipOrder(ROLE.VIP_CUSTOMER)
    await store.getState().addNormalOrder(ROLE.NORMAL_CUSTOMER)
    const ids = store.getState().orders.map((o) => o.id)
    expect(ids).toEqual([1, 2, 3])
  })

  it('adds bot', async () => {
    await store.getState().addBot()
    expect(store.getState().bots).toHaveLength(1)
    expect(store.getState().bots[0].status).toBe(BOT_STATUS.IDLE)
  })

  it('bot picks pending order on add', async () => {
    await store.getState().addNormalOrder(ROLE.NORMAL_CUSTOMER)
    expect(store.getState().orders[0].status).toBe(ORDER_STATUS.PENDING)
    await store.getState().addBot()
    expect(store.getState().orders[0].status).toBe(ORDER_STATUS.PROCESSING)
    expect(store.getState().bots[0].status).toBe(BOT_STATUS.PROCESSING)
    expect(store.getState().bots[0].orderId).toBe(1)
  })

  it('removes bot', async () => {
    await store.getState().addBot()
    expect(store.getState().bots).toHaveLength(1)
    await store.getState().removeBot()
    expect(store.getState().bots).toHaveLength(0)
  })

  it('removeBot returns processing order to pending', async () => {
    await store.getState().addNormalOrder(ROLE.NORMAL_CUSTOMER)
    await store.getState().addBot()
    expect(store.getState().orders[0].status).toBe(ORDER_STATUS.PROCESSING)
    await store.getState().removeBot()
    expect(store.getState().orders[0].status).toBe(ORDER_STATUS.PENDING)
  })

  it('removeBot on empty bots does nothing', async () => {
    await store.getState().removeBot()
    expect(store.getState().bots).toEqual([])
  })

  it('tick completes order after cooking time', async () => {
    await store.getState().addNormalOrder(ROLE.NORMAL_CUSTOMER)
    await store.getState().addBot()
    const now = store.getState().orders[0].createdAt
    await store.getState().tick(now + COOKING_TIME_MS)
    expect(store.getState().orders[0].status).toBe(ORDER_STATUS.COMPLETED)
    expect(store.getState().bots[0].status).toBe(BOT_STATUS.IDLE)
  })

  it('full flow: orders processed sequentially', async () => {
    await store.getState().addNormalOrder(ROLE.NORMAL_CUSTOMER)
    await store.getState().addVipOrder(ROLE.VIP_CUSTOMER)
    await store.getState().addBot()
    expect(store.getState().orders.find((o) => o.id === 2)!.status).toBe(ORDER_STATUS.PROCESSING)
    expect(store.getState().orders.find((o) => o.id === 1)!.status).toBe(ORDER_STATUS.PENDING)
    await store.getState().tick(Date.now() + COOKING_TIME_MS)
    expect(store.getState().orders.find((o) => o.id === 2)!.status).toBe(ORDER_STATUS.COMPLETED)
    expect(store.getState().orders.find((o) => o.id === 1)!.status).toBe(ORDER_STATUS.PROCESSING)
  })

  it('removeBot prioritizes idle > normal-processing > VIP-processing', async () => {
    await store.getState().addVipOrder(ROLE.VIP_CUSTOMER)        // id=1 vip (pending)
    await store.getState().addNormalOrder(ROLE.NORMAL_CUSTOMER)  // id=2 normal (pending)
    await store.getState().addBot()   // bot1 picks vip (id=1)
    await store.getState().addBot()   // bot2 picks normal (id=2)
    await store.getState().addBot()   // bot3 idle (no pending left)
    expect(store.getState().bots).toHaveLength(3)
    const idleBot = store.getState().bots.find((b) => b.status === BOT_STATUS.IDLE)
    expect(idleBot).toBeDefined()

    // idle removed first
    await store.getState().removeBot()
    expect(store.getState().bots).toHaveLength(2)
    expect(store.getState().bots.find((b) => b.id === idleBot!.id)).toBeUndefined()

    // normal-processing removed second
    await store.getState().removeBot()
    expect(store.getState().orders.find((o) => o.id === 2)!.status).toBe(ORDER_STATUS.PENDING)
    expect(store.getState().orders.find((o) => o.id === 1)!.status).toBe(ORDER_STATUS.PROCESSING)

    // VIP-processing removed last
    await store.getState().removeBot()
    expect(store.getState().bots).toHaveLength(0)
  })

  it('order and bot ids are independent counters', async () => {
    await store.getState().addNormalOrder(ROLE.NORMAL_CUSTOMER)  // order id=1
    await store.getState().addBot()                              // bot id=1
    await store.getState().addNormalOrder(ROLE.NORMAL_CUSTOMER)  // order id=2
    await store.getState().addBot()                              // bot id=2
    const orderIds = store.getState().orders.map((o) => o.id)
    const botIds = store.getState().bots.map((b) => b.id)
    expect(orderIds).toEqual([1, 2])
    expect(botIds).toEqual([1, 2])
  })

  it('order stores correct userId based on role', async () => {
    await store.getState().addNormalOrder(ROLE.NORMAL_CUSTOMER)
    await store.getState().addVipOrder(ROLE.VIP_CUSTOMER)
    await store.getState().addNormalOrder(ROLE.MANAGER)
    const orders = store.getState().orders
    expect(orders[0].userId).toBe(1)
    expect(orders[1].userId).toBe(2)
    expect(orders[2].userId).toBe(0)
  })

  it('tick sets completedAt on completion', async () => {
    await store.getState().addNormalOrder(ROLE.NORMAL_CUSTOMER)
    await store.getState().addBot()
    const now = Date.now()
    await store.getState().tick(now + COOKING_TIME_MS)
    const order = store.getState().orders[0]
    expect(order.status).toBe(ORDER_STATUS.COMPLETED)
    expect(order.completedAt).toBeGreaterThanOrEqual(now)
  })
})
