import { OrderQueue } from '../order-queue'

describe('OrderQueue', () => {
  test('VIP orders queue before NORMAL', () => {
    const q = new OrderQueue()
    const n1 = q.createOrder('NORMAL')
    const n2 = q.createOrder('NORMAL')
    const v1 = q.createOrder('VIP')

    expect(q.dequeue()).toEqual(v1) // VIP first
    expect(q.dequeue()).toEqual(n1) // then NORMAL
    expect(q.dequeue()).toEqual(n2)
  })

  test('Requeued order goes back to front', () => {
    const q = new OrderQueue()
    const n1 = q.createOrder('NORMAL')
    const n2 = q.createOrder('NORMAL')

    const order = q.dequeue()
    q.requeue(order!)

    const next = q.dequeue()
    expect(next?.id).toBe(n1.id) // requeued first
  })

  test('Order IDs are unique and increasing', () => {
    const q = new OrderQueue()
    const o1 = q.createOrder('NORMAL')
    const o2 = q.createOrder('VIP')
    expect(o2.id).toBeGreaterThan(o1.id)
  })
})
