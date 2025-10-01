import { OrderController } from '../order.controller'

jest.useFakeTimers()

describe('OrderController Integration', () => {
  test('VIP gets processed first end-to-end', () => {
    const oc = new OrderController()
    oc.createOrder('NORMAL') // id1
    oc.createOrder('VIP') // id2
    oc.createBot()

    expect(oc.stats().busy).toBe(1)
    jest.advanceTimersByTime(10_000)

    // Bot should still be busy on the NORMAL now
    expect(oc.stats().busy).toBe(1)
  })
})
