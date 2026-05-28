'use strict'

const { OrderManager } = require('../src/OrderManager')

describe('OrderManager', () => {
  let om

  beforeEach(() => { om = new OrderManager() })

  // ── addNormalOrder ────────────────────────────────────────────────────────
  describe('addNormalOrder', () => {
    it('creates an order with type "normal" and status "pending"', () => {
      const o = om.addNormalOrder()
      expect(o.type).toBe('normal')
      expect(o.status).toBe('pending')
    })

    it('increments id on each call', () => {
      const a = om.addNormalOrder()
      const b = om.addNormalOrder()
      expect(b.id).toBe(a.id + 1)
    })

    it('appends to end of queue', () => {
      om.addNormalOrder()
      om.addNormalOrder()
      const q = om.getQueueSnapshot()
      expect(q.length).toBe(2)
      expect(q[1].id).toBe(2)
    })
  })

  // ── addVIPOrder ───────────────────────────────────────────────────────────
  describe('addVIPOrder', () => {
    it('creates an order with type "vip"', () => {
      const o = om.addVIPOrder()
      expect(o.type).toBe('vip')
    })

    it('inserts VIP before any normal orders', () => {
      om.addNormalOrder()  // #1
      om.addNormalOrder()  // #2
      const vip = om.addVIPOrder()  // #3

      const q = om.getQueueSnapshot()
      expect(q[0].id).toBe(vip.id)
      expect(q[1].type).toBe('normal')
      expect(q[2].type).toBe('normal')
    })

    it('inserts after the last existing VIP', () => {
      om.addNormalOrder()  // #1
      om.addVIPOrder()     // #2 → pos 0
      om.addVIPOrder()     // #3 → pos 1 (after #2)

      const q = om.getQueueSnapshot()
      expect(q[0].id).toBe(2)
      expect(q[1].id).toBe(3)
      expect(q[2].type).toBe('normal')
    })

    it('multiple VIPs all sit before normals', () => {
      om.addNormalOrder()  // #1
      om.addVIPOrder()     // #2
      om.addNormalOrder()  // #3
      om.addVIPOrder()     // #4

      const q = om.getQueueSnapshot()
      const types = q.map(o => o.type)
      const firstNormal = types.indexOf('normal')
      types.slice(0, firstNormal).forEach(t => expect(t).toBe('vip'))
    })
  })

  // ── getNextPendingOrder ───────────────────────────────────────────────────
  describe('getNextPendingOrder', () => {
    it('returns null when queue is empty', () => {
      expect(om.getNextPendingOrder()).toBeNull()
    })

    it('returns the first pending order', () => {
      const o = om.addNormalOrder()
      expect(om.getNextPendingOrder().id).toBe(o.id)
    })

    it('skips orders that are already processing', () => {
      const a = om.addNormalOrder()
      om.addNormalOrder()
      om.markProcessing(a.id, 99)
      const next = om.getNextPendingOrder()
      expect(next.id).not.toBe(a.id)
    })
  })

  // ── markProcessing ────────────────────────────────────────────────────────
  describe('markProcessing', () => {
    it('changes order status to "processing" and records botId', () => {
      const o = om.addNormalOrder()
      om.markProcessing(o.id, 7)
      expect(o.status).toBe('processing')
      expect(o.botId).toBe(7)
    })
  })

  // ── completeOrder ─────────────────────────────────────────────────────────
  describe('completeOrder', () => {
    it('removes order from queue and adds to completed', () => {
      const o = om.addNormalOrder()
      om.completeOrder(o.id)
      expect(om.getQueueSnapshot().length).toBe(0)
      expect(om.getCompletedSnapshot().length).toBe(1)
    })

    it('sets completedAt timestamp', () => {
      const o = om.addNormalOrder()
      const completed = om.completeOrder(o.id)
      expect(completed.completedAt).toBeInstanceOf(Date)
    })

    it('returns null for unknown id', () => {
      expect(om.completeOrder(999)).toBeNull()
    })
  })

  // ── returnOrder ───────────────────────────────────────────────────────────
  describe('returnOrder', () => {
    it('re-inserts a normal order at the end', () => {
      om.addNormalOrder()  // #1
      const o2 = om.addNormalOrder()  // #2
      om.markProcessing(o2.id, 1)
      om.returnOrder(o2)
      const q = om.getQueueSnapshot()
      expect(q[q.length - 1].id).toBe(o2.id)
    })

    it('re-inserts a VIP order before normals', () => {
      om.addNormalOrder()  // #1
      const vip = om.addVIPOrder()  // #2 → queue[0]
      om.markProcessing(vip.id, 1)
      om.returnOrder(vip)
      expect(om.getQueueSnapshot()[0].id).toBe(vip.id)
    })

    it('resets status to "pending" and clears botId', () => {
      const o = om.addNormalOrder()
      om.markProcessing(o.id, 5)
      om.returnOrder(o)
      expect(o.status).toBe('pending')
      expect(o.botId).toBeNull()
    })
  })
})
