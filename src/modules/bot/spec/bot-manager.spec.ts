import { BotManager } from '../bot-manager'
import { OrderQueue } from '../../order/order-queue'

jest.useFakeTimers()

describe('BotManager', () => {
  test('Bot processes orders one at a time (10s each)', () => {
    const q = new OrderQueue()
    q.createOrder('NORMAL')
    q.createOrder('NORMAL')

    const bm = new BotManager(q)
    bm.createBot()

    expect(bm.busyCount()).toBe(1)
    jest.advanceTimersByTime(10_000)
    expect(bm.busyCount()).toBe(1) // picks next
    jest.advanceTimersByTime(10_000)
    expect(bm.busyCount()).toBe(0) // finished all
  })

  test('Removing a busy bot requeues its order', () => {
    const q = new OrderQueue()
    q.createOrder('NORMAL')
    const bm = new BotManager(q)

    bm.createBot()
    expect(bm.busyCount()).toBe(1)

    bm.deleteBot()
    expect(bm.botCount()).toBe(0)
    expect(q.pendingCounts().normal).toBe(1)
  })

  test('Multiple bots share the queue', () => {
    const q = new OrderQueue()
    q.createOrder('VIP')
    q.createOrder('NORMAL')
    q.createOrder('NORMAL')

    const bm = new BotManager(q)
    bm.createBot()
    bm.createBot()

    expect(bm.busyCount()).toBe(2)

    jest.advanceTimersByTime(10_000)
    expect(bm.busyCount()).toBe(1) // one bot picks remaining
  })
})
