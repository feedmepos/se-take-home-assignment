/**
 * OrderController domain tests
 *
 * Group 1 — queue & dispatch rules
 * Group 2 — timer lifecycle (no leaked timeouts after destroy/removeBot)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PROCESSING_SECONDS } from './constants'
import { OrderController } from './order-controller'

describe('OrderController', () => {
  /** 订单 ID：连续创建 Normal 订单时，id 从 INITIAL_ORDER_ID(1001) 递增 */
  it('creates normal orders with increasing ids', () => {
    const controller = new OrderController()
    controller.addNormalOrder()
    controller.addNormalOrder()

    const snapshot = controller.getSnapshot()
    expect(snapshot.orders.map((o) => o.id)).toEqual([1001, 1002])
  })

  /** VIP 优先级：待处理队列中 VIP 始终排在 Normal 前面（同优先级内 FIFO） */
  it('queues VIP before normal orders', () => {
    const controller = new OrderController()
    controller.addNormalOrder()
    controller.addVipOrder()
    controller.addNormalOrder()

    const pending = controller.getPendingOrders()

    expect(pending.map((o) => o.id)).toEqual([1002, 1001, 1003])
  })

  /** 减 Bot 回队：多个 Bot 同时处理时，按 sequence 恢复 pending 顺序（先回队的在前） */
  it('reinserts orders by sequence when multiple bots are removed', () => {
    const controller = new OrderController()
    controller.addVipOrder() // #1001 seq=1
    controller.addVipOrder() // #1002 seq=2
    controller.addBot() // bot1 → #1001
    controller.addBot() // bot2 → #1002

    controller.removeBot() // remove bot2, #1002 back to pending
    controller.removeBot() // remove bot1, #1001 back to pending

    expect(controller.getPendingOrders().map((o) => o.id)).toEqual([1001, 1002])
  })

  /** 减 Bot 回队：处理期间新到的订单不会插到被中断订单前面（按 sequence 插回原位） */
  it('reinserts before orders that arrived while processing', () => {
    const controller = new OrderController()
    controller.addVipOrder() // #1001
    controller.addBot() // bot1 processing #1001
    controller.addVipOrder() // #1002 while #1001 processing

    controller.removeBot() // #1001 back to pending, before #1002

    expect(controller.getPendingOrders().map((o) => o.id)).toEqual([1001, 1002])
  })
})

describe('OrderController timer cleanup', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  /** 正常完成：Bot 10s 计时结束后，订单从 Processing 进入 Complete */
  it('completes an order when the bot timer elapses', () => {
    const controller = new OrderController()
    controller.addBot()
    controller.addNormalOrder()

    expect(controller.getProcessingOrders()).toHaveLength(1)
    expect(controller.getCompletedOrders()).toHaveLength(0)

    vi.advanceTimersByTime(PROCESSING_SECONDS * 1000)

    expect(controller.getProcessingOrders()).toHaveLength(0)
    expect(controller.getCompletedOrders()).toHaveLength(1)
    expect(controller.getCompletedOrders()[0]?.id).toBe(1001)
  })

  /** destroy：卸载时清掉 Bot timer，快进时间也不会误触发完成 */
  it('destroy clears pending bot timers so completion does not fire later', () => {
    const controller = new OrderController()
    controller.addBot()
    controller.addNormalOrder()

    expect(vi.getTimerCount()).toBe(1)

    controller.destroy()

    expect(vi.getTimerCount()).toBe(0)
    expect(controller.getProcessingOrders()).toHaveLength(0)

    vi.advanceTimersByTime(PROCESSING_SECONDS * 1000)

    expect(controller.getCompletedOrders()).toHaveLength(0)
    expect(controller.getPendingOrders()).toHaveLength(0)
  })

  /** removeBot：正在处理的 Bot 被移除时 cancelWork，订单回 pending，timer 不会稍后完成 */
  it('removeBot clears the processing timer for the removed bot', () => {
    const controller = new OrderController()
    controller.addBot()
    controller.addNormalOrder()

    expect(vi.getTimerCount()).toBe(1)

    controller.removeBot()

    expect(vi.getTimerCount()).toBe(0)
    expect(controller.getProcessingOrders()).toHaveLength(0)
    expect(controller.getPendingOrders().map((o) => o.id)).toEqual([1001])

    vi.advanceTimersByTime(PROCESSING_SECONDS * 1000)

    expect(controller.getCompletedOrders()).toHaveLength(0)
  })

  /** removeBot × N：多个 Bot 各有 timer，全部移除后 vi.getTimerCount() 为 0，无残留 */
  it('removeBot clears timers for every processing bot', () => {
    const controller = new OrderController()
    controller.addBot()
    controller.addBot()
    controller.addNormalOrder()
    controller.addNormalOrder()

    expect(vi.getTimerCount()).toBe(2)

    controller.removeBot()
    controller.removeBot()

    expect(vi.getTimerCount()).toBe(0)

    vi.advanceTimersByTime(PROCESSING_SECONDS * 1000)

    expect(controller.getCompletedOrders()).toHaveLength(0)
    expect(controller.getPendingOrders().map((o) => o.id)).toEqual([1001, 1002])
  })
})
