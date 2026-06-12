import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OrderController, PROCESSING_MS } from './orderController'

describe('OrderController', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps normal orders in increasing order', () => {
    const controller = new OrderController()

    controller.createOrder('NORMAL')
    controller.createOrder('NORMAL')
    controller.createOrder('NORMAL')

    expect(controller.pendingOrders.map((order) => order.id)).toEqual([1, 2, 3])
  })

  it('places VIP orders before normal orders and after existing VIP orders', () => {
    const controller = new OrderController()

    controller.createOrder('NORMAL')
    controller.createOrder('NORMAL')
    controller.createOrder('VIP')
    controller.createOrder('VIP')
    controller.createOrder('NORMAL')

    expect(controller.pendingOrders.map((order) => `${order.type}-${order.id}`)).toEqual([
      'VIP-3',
      'VIP-4',
      'NORMAL-1',
      'NORMAL-2',
      'NORMAL-5'
    ])
  })

  it('starts an idle bot as soon as work is available', () => {
    const controller = new OrderController()

    controller.addBot()
    controller.createOrder('VIP')

    expect(controller.pendingOrders).toHaveLength(0)
    expect(controller.bots[0].status).toBe('PROCESSING')
    expect(controller.bots[0].currentOrder?.id).toBe(1)
  })

  it('completes an order after 10 seconds and continues with the next pending order', () => {
    const controller = new OrderController()

    controller.createOrder('NORMAL')
    controller.createOrder('NORMAL')
    controller.addBot()

    expect(controller.bots[0].currentOrder?.id).toBe(1)

    vi.advanceTimersByTime(PROCESSING_MS)

    expect(controller.completedOrders.map((order) => order.id)).toEqual([1])
    expect(controller.bots[0].status).toBe('PROCESSING')
    expect(controller.bots[0].currentOrder?.id).toBe(2)

    vi.advanceTimersByTime(PROCESSING_MS)

    expect(controller.completedOrders.map((order) => order.id)).toEqual([1, 2])
    expect(controller.bots[0].status).toBe('IDLE')
  })

  it('records order create, cooking, and complete times', () => {
    const controller = new OrderController()

    vi.setSystemTime(1_000)
    controller.createOrder('NORMAL')

    vi.setSystemTime(2_000)
    controller.addBot()

    expect(controller.bots[0].currentOrder).toMatchObject({
      id: 1,
      createdAt: 1_000,
      cookingStartedAt: 2_000,
      completedAt: null,
      cookingBotId: 1,
      cancelCount: 0
    })

    vi.advanceTimersByTime(PROCESSING_MS)

    expect(controller.completedOrders[0]).toMatchObject({
      id: 1,
      createdAt: 1_000,
      cookingStartedAt: 2_000,
      completedAt: 12_000,
      cookingBotId: 1,
      cancelCount: 0
    })
  })

  it('distributes pending orders across multiple bots in queue order', () => {
    const controller = new OrderController()

    controller.createOrder('NORMAL')
    controller.createOrder('VIP')
    controller.createOrder('NORMAL')
    controller.addBot()
    controller.addBot()

    expect(controller.bots.map((bot) => bot.currentOrder?.id)).toEqual([2, 1])
    expect(controller.pendingOrders.map((order) => order.id)).toEqual([3])
  })

  it('removes the latest idle bot without changing orders', () => {
    const controller = new OrderController()

    controller.addBot()
    controller.addBot()
    controller.removeLatestBot()

    expect(controller.bots.map((bot) => bot.id)).toEqual([1])
    expect(controller.pendingOrders).toHaveLength(0)
    expect(controller.completedOrders).toHaveLength(0)
  })

  it('removes a specified idle bot without removing the latest bot', () => {
    const controller = new OrderController()

    controller.addBot()
    controller.addBot()
    controller.addBot()
    controller.removeBot(2)

    expect(controller.bots.map((bot) => bot.id)).toEqual([1, 3])
  })

  it('returns a removed processing bot order to pending and prevents stale completion', () => {
    const controller = new OrderController()

    controller.createOrder('NORMAL')
    controller.addBot()
    controller.removeLatestBot()

    expect(controller.bots).toHaveLength(0)
    expect(controller.pendingOrders.map((order) => order.id)).toEqual([1])

    vi.advanceTimersByTime(PROCESSING_MS)

    expect(controller.completedOrders).toHaveLength(0)
    expect(controller.pendingOrders.map((order) => order.id)).toEqual([1])
    expect(controller.pendingOrders[0].cookingStartedAt).toBeNull()
    expect(controller.pendingOrders[0].completedAt).toBeNull()
    expect(controller.pendingOrders[0].cookingBotId).toBeNull()
    expect(controller.pendingOrders[0].cancelCount).toBe(1)
  })

  it('keeps returned orders behind pending VIP orders while preserving priority', () => {
    const controller = new OrderController()

    controller.createOrder('NORMAL')
    controller.addBot()
    controller.createOrder('VIP')
    controller.createOrder('NORMAL')
    controller.removeLatestBot()

    expect(controller.pendingOrders.map((order) => `${order.type}-${order.id}`)).toEqual([
      'VIP-2',
      'NORMAL-1',
      'NORMAL-3'
    ])
  })

  it('returns a specified processing bot order and lets remaining bots continue', () => {
    const controller = new OrderController()

    controller.createOrder('NORMAL')
    controller.createOrder('NORMAL')
    controller.createOrder('NORMAL')
    controller.addBot()
    controller.addBot()
    controller.removeBot(1)

    expect(controller.bots.map((bot) => bot.id)).toEqual([2])
    expect(controller.bots[0].currentOrder?.id).toBe(2)
    expect(controller.pendingOrders.map((order) => order.id)).toEqual([1, 3])

    vi.advanceTimersByTime(PROCESSING_MS)

    expect(controller.completedOrders.map((order) => order.id)).toEqual([2])
    expect(controller.bots[0].currentOrder?.id).toBe(1)
  })

  it('keeps cancel count and final cooking bot when an interrupted order completes later', () => {
    const controller = new OrderController()

    controller.createOrder('NORMAL')
    controller.addBot()
    controller.removeBot(1)
    controller.addBot()

    expect(controller.bots[0].currentOrder).toMatchObject({
      id: 1,
      cookingBotId: 2,
      cancelCount: 1
    })

    vi.advanceTimersByTime(PROCESSING_MS)

    expect(controller.completedOrders[0]).toMatchObject({
      id: 1,
      cookingBotId: 2,
      cancelCount: 1
    })
  })

  it('ignores an unknown bot id', () => {
    const controller = new OrderController()

    controller.addBot()

    expect(controller.removeBot(999)).toBeNull()
    expect(controller.bots.map((bot) => bot.id)).toEqual([1])
  })
})
