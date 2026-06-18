import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { OrderController } from '../backend/order-controller.js'
import { runDemo } from '../backend/cli.js'

function createController({ processingTimeMs = 10_000, now = () => new Date('2026-06-18T12:00:00Z') } = {}) {
  return new OrderController({
    processingTimeMs,
    now,
  })
}

describe('OrderController', () => {
  it('places VIP orders ahead of normal orders and preserves VIP FIFO', () => {
    const controller = createController()

    controller.addNormalOrder()
    controller.addNormalOrder()
    controller.addVipOrder()
    controller.addVipOrder()
    controller.addNormalOrder()

    expect(controller.getState().pendingOrders.map((order) => `${order.id}-${order.priority}`)).toEqual([
      '3-VIP',
      '4-VIP',
      '1-NORMAL',
      '2-NORMAL',
      '5-NORMAL',
    ])
  })

  it('assigns unique increasing order IDs', () => {
    const controller = createController()

    expect(controller.addNormalOrder()).toBe(1)
    expect(controller.addVipOrder()).toBe(2)
    expect(controller.addNormalOrder()).toBe(3)
  })

  it('starts processing immediately when a bot is added', () => {
    vi.useFakeTimers()
    const controller = createController({ now: () => new Date('2026-06-18T12:00:00Z') })

    controller.addVipOrder()
    controller.addBot()

    const state = controller.getState()
    expect(state.pendingOrders).toHaveLength(0)
    expect(state.bots[0]).toMatchObject({
      id: 1,
      status: 'BUSY',
      currentOrder: { id: 1, priority: 'VIP' },
    })

    vi.useRealTimers()
  })

  it('moves orders to completed after the processing time', () => {
    vi.useFakeTimers()
    const now = vi.fn(() => new Date('2026-06-18T12:00:00Z'))
    const controller = createController({ processingTimeMs: 10_000, now })

    controller.addNormalOrder()
    controller.addBot()

    vi.advanceTimersByTime(10_000)

    const state = controller.getState()
    expect(state.pendingOrders).toHaveLength(0)
    expect(state.completedOrders).toHaveLength(1)
    expect(state.completedOrders[0]).toMatchObject({ id: 1, priority: 'NORMAL' })
    expect(state.bots[0]).toMatchObject({ status: 'IDLE', currentOrder: null })

    vi.useRealTimers()
  })

  it('keeps idle bots waiting until a new order arrives', () => {
    vi.useFakeTimers()
    const controller = createController()

    controller.addBot()
    expect(controller.getState().bots[0].status).toBe('IDLE')

    controller.addNormalOrder()
    expect(controller.getState().bots[0]).toMatchObject({
      status: 'BUSY',
      currentOrder: { id: 1, priority: 'NORMAL' },
    })

    vi.useRealTimers()
  })

  it('removes the newest idle bot without affecting pending orders', () => {
    const controller = createController()

    controller.addNormalOrder()
    controller.addBot()
    controller.addBot()

    const removedBotId = controller.removeBot()
    const state = controller.getState()

    expect(removedBotId).toBe(2)
    expect(state.bots.map((bot) => bot.id)).toEqual([1])
    expect(state.bots[0].currentOrder?.id).toBe(1)
  })

  it('requeues the newest busy bot order with the correct priority position', () => {
    vi.useFakeTimers()
    const controller = createController()

    controller.addVipOrder()
    controller.addNormalOrder()
    controller.addNormalOrder()
    controller.addBot()
    controller.addBot()
    controller.addVipOrder()

    const removedBotId = controller.removeBot()
    const state = controller.getState()

    expect(removedBotId).toBe(2)
    expect(state.pendingOrders.map((order) => `${order.id}-${order.priority}`)).toEqual([
      '4-VIP',
      '2-NORMAL',
      '3-NORMAL',
    ])

    vi.useRealTimers()
  })

  it('lets multiple bots process concurrently while respecting queue priority', () => {
    vi.useFakeTimers()
    const controller = createController()

    controller.addNormalOrder()
    controller.addVipOrder()
    controller.addNormalOrder()
    controller.addVipOrder()
    controller.addBot()
    controller.addBot()

    const state = controller.getState()
    expect(state.bots.map((bot) => `${bot.currentOrder?.id}-${bot.currentOrder?.priority}`)).toEqual([
      '2-VIP',
      '4-VIP',
    ])
    expect(state.pendingOrders.map((order) => `${order.id}-${order.priority}`)).toEqual([
      '1-NORMAL',
      '3-NORMAL',
    ])

    vi.useRealTimers()
  })
})

describe('runDemo', () => {
  it('emits output matching the saved result format', async () => {
    vi.useFakeTimers()
    const writeLine = vi.fn()

    const runPromise = runDemo({
      processingTimeMs: 10,
      writeLine,
    })

    await vi.advanceTimersByTimeAsync(100)
    await runPromise

    const normalizeTimestamp = (line) => line.replace(/^\[\d{2}:\d{2}:\d{2}\]/, '[00:00:00]')
    const expectedLines = readFileSync(new URL('../scripts/result.txt', import.meta.url), 'utf8')
      .split('\n')
      .map(normalizeTimestamp)
    const actualLines = writeLine.mock.calls.map(([line]) => normalizeTimestamp(line))

    expect(actualLines).toEqual(expectedLines)

    vi.useRealTimers()
  })
})
