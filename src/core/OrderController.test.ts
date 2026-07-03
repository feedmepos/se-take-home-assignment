import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OrderController } from './OrderController'

const PROCESS_MS = 10_000

describe('OrderController', () => {
  let controller: OrderController

  beforeEach(() => {
    vi.useFakeTimers()
    controller = new OrderController(PROCESS_MS)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('order creation & numbering', () => {
    it('assigns unique, increasing order numbers', () => {
      const a = controller.addOrder('NORMAL')
      const b = controller.addOrder('VIP')
      const c = controller.addOrder('NORMAL')
      expect([a.id, b.id, c.id]).toEqual([1, 2, 3])
    })

    it('a new normal order lands in PENDING', () => {
      controller.addOrder('NORMAL')
      const { pending } = controller.getSnapshot()
      expect(pending).toHaveLength(1)
      expect(pending[0]).toMatchObject({ id: 1, type: 'NORMAL', status: 'PENDING' })
    })
  })

  describe('VIP priority queueing', () => {
    it('places a VIP order ahead of all normal orders', () => {
      controller.addOrder('NORMAL') // #1
      controller.addOrder('NORMAL') // #2
      controller.addOrder('VIP') // #3 -> should jump to front
      const ids = controller.getSnapshot().pending.map((o) => o.id)
      expect(ids).toEqual([3, 1, 2])
    })

    it('places a VIP order behind existing VIP orders (VIP FIFO)', () => {
      controller.addOrder('VIP') // #1
      controller.addOrder('NORMAL') // #2
      controller.addOrder('VIP') // #3 -> behind #1, ahead of #2
      const ids = controller.getSnapshot().pending.map((o) => o.id)
      expect(ids).toEqual([1, 3, 2])
    })

    it('keeps the [VIP…, NORMAL…] invariant with an interleaved sequence', () => {
      controller.addOrder('NORMAL') // #1
      controller.addOrder('VIP') // #2
      controller.addOrder('NORMAL') // #3
      controller.addOrder('VIP') // #4
      const ids = controller.getSnapshot().pending.map((o) => o.id)
      expect(ids).toEqual([2, 4, 1, 3])
    })
  })

  describe('bot processing', () => {
    it('a new bot immediately picks up a pending order', () => {
      controller.addOrder('NORMAL')
      controller.addBot()
      const { pending, bots } = controller.getSnapshot()
      expect(pending).toHaveLength(0)
      expect(bots[0]).toMatchObject({ status: 'PROCESSING' })
      expect(bots[0].currentOrder?.id).toBe(1)
    })

    it('completes an order after exactly 10 seconds and moves it to COMPLETE', () => {
      controller.addOrder('NORMAL')
      controller.addBot()

      vi.advanceTimersByTime(PROCESS_MS - 1)
      expect(controller.getSnapshot().complete).toHaveLength(0)

      vi.advanceTimersByTime(1)
      const { complete, bots } = controller.getSnapshot()
      expect(complete).toHaveLength(1)
      expect(complete[0]).toMatchObject({ id: 1, status: 'COMPLETE' })
      expect(bots[0].status).toBe('IDLE')
    })

    it('processes VIP before normal when a single bot is available', () => {
      controller.addOrder('NORMAL') // #1
      controller.addOrder('VIP') // #2
      controller.addBot()
      // Bot should have grabbed the VIP (#2) first.
      expect(controller.getSnapshot().bots[0].currentOrder?.id).toBe(2)

      vi.advanceTimersByTime(PROCESS_MS)
      const s = controller.getSnapshot()
      expect(s.complete.map((o) => o.id)).toEqual([2])
      expect(s.bots[0].currentOrder?.id).toBe(1) // now on the normal order
    })

    it('a bot goes IDLE when there is no pending order left', () => {
      controller.addOrder('NORMAL')
      controller.addBot()
      vi.advanceTimersByTime(PROCESS_MS)
      expect(controller.getSnapshot().bots[0].status).toBe('IDLE')
    })

    it('two bots process two orders in parallel', () => {
      controller.addOrder('NORMAL')
      controller.addOrder('NORMAL')
      controller.addBot()
      controller.addBot()
      expect(controller.getSnapshot().pending).toHaveLength(0)
      vi.advanceTimersByTime(PROCESS_MS)
      expect(controller.getSnapshot().complete).toHaveLength(2)
    })
  })

  describe('removing bots', () => {
    it('destroys the newest bot', () => {
      controller.addBot() // #1
      controller.addBot() // #2
      controller.removeBot()
      const ids = controller.getSnapshot().bots.map((b) => b.id)
      expect(ids).toEqual([1])
    })

    it('returns an in-progress order to PENDING at its priority position', () => {
      controller.addOrder('VIP') // #1
      controller.addOrder('NORMAL') // #2
      controller.addBot() // grabs VIP #1
      expect(controller.getSnapshot().bots[0].currentOrder?.id).toBe(1)

      controller.removeBot()
      const s = controller.getSnapshot()
      expect(s.bots).toHaveLength(0)
      // VIP #1 is back in front of normal #2, un-processed.
      expect(s.pending.map((o) => o.id)).toEqual([1, 2])
      expect(s.pending[0].status).toBe('PENDING')
    })

    it('does not lose the timer: a requeued order restarts cleanly on a new bot', () => {
      controller.addOrder('NORMAL')
      controller.addBot()
      vi.advanceTimersByTime(5_000) // halfway through
      controller.removeBot() // order returns to PENDING

      controller.addBot() // new bot picks it up, fresh 10s
      vi.advanceTimersByTime(PROCESS_MS - 1)
      expect(controller.getSnapshot().complete).toHaveLength(0)
      vi.advanceTimersByTime(1)
      expect(controller.getSnapshot().complete).toHaveLength(1)
    })

    it('a stale timer from a removed bot never completes an order', () => {
      controller.addOrder('NORMAL')
      controller.addBot()
      controller.removeBot()
      vi.advanceTimersByTime(PROCESS_MS * 2)
      const s = controller.getSnapshot()
      expect(s.complete).toHaveLength(0)
      expect(s.pending).toHaveLength(1)
    })

    it('returns a VIP to its original slot, ahead of VIPs that arrived later', () => {
      controller.addOrder('VIP') // #1
      controller.addBot() // bot grabs #1
      controller.addOrder('VIP') // #2
      controller.addOrder('VIP') // #3
      controller.removeBot() // #1 must return to the FRONT of the VIP group
      expect(controller.getSnapshot().pending.map((o) => o.id)).toEqual([1, 2, 3])
    })

    it('returns a normal order ahead of normals that arrived later', () => {
      controller.addOrder('NORMAL') // #1
      controller.addBot() // grabs #1
      controller.addOrder('NORMAL') // #2
      controller.addOrder('NORMAL') // #3
      controller.removeBot()
      expect(controller.getSnapshot().pending.map((o) => o.id)).toEqual([1, 2, 3])
    })

    it('reinserts a returned VIP by arrival among VIPs and still ahead of normals', () => {
      controller.addOrder('VIP') // #1
      controller.addOrder('VIP') // #2
      controller.addBot() // grabs #1
      controller.addOrder('VIP') // #3
      controller.addOrder('NORMAL') // #4  -> pending: [#2, #3, #4]
      controller.removeBot() // #1 returns to front of VIP group
      expect(controller.getSnapshot().pending.map((o) => o.id)).toEqual([1, 2, 3, 4])
    })

    it('returns null when there are no bots to remove', () => {
      expect(controller.removeBot()).toBeNull()
    })
  })

  describe('subscription', () => {
    it('notifies subscribers on state changes and stops after unsubscribe', () => {
      const listener = vi.fn()
      const unsubscribe = controller.subscribe(listener)

      controller.addOrder('NORMAL')
      controller.addBot()
      expect(listener).toHaveBeenCalledTimes(2)

      unsubscribe()
      controller.addOrder('VIP')
      expect(listener).toHaveBeenCalledTimes(2)
    })

    it('returns a fresh snapshot reference only when state changes', () => {
      const first = controller.getSnapshot()
      expect(controller.getSnapshot()).toBe(first) // stable between changes
      controller.addOrder('NORMAL')
      expect(controller.getSnapshot()).not.toBe(first) // new ref after change
    })
  })
})
