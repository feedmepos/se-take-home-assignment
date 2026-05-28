'use strict'

const { OrderManager } = require('../src/OrderManager')
const { BotManager }   = require('../src/BotManager')

// Use fake timers so tests don't have to actually wait 10 s
jest.useFakeTimers()

function makeManagers(processingTime = 5000) {
  const om = new OrderManager()
  const bm = new BotManager(om, processingTime)
  return { om, bm }
}

describe('BotManager', () => {
  afterEach(() => jest.clearAllTimers())

  // ── addBot ────────────────────────────────────────────────────────────────
  describe('addBot', () => {
    it('starts idle when there are no pending orders', () => {
      const { bm } = makeManagers()
      const bot = bm.addBot()
      expect(bot.status).toBe('idle')
      expect(bot.currentOrder).toBeNull()
    })

    it('immediately picks up a pending order', () => {
      const { om, bm } = makeManagers()
      const order = om.addNormalOrder()
      const bot = bm.addBot()
      expect(bot.status).toBe('working')
      expect(bot.currentOrder.id).toBe(order.id)
      expect(order.status).toBe('processing')
    })

    it('assigns bots in FIFO order (VIP first due to queue ordering)', () => {
      const { om, bm } = makeManagers()
      om.addNormalOrder()  // #1
      om.addVIPOrder()     // #2 – queue: [#2vip, #1normal]
      const b1 = bm.addBot()
      expect(b1.currentOrder.id).toBe(2)  // VIP first
      const b2 = bm.addBot()
      expect(b2.currentOrder.id).toBe(1)
    })
  })

  // ── removeLatestBot ───────────────────────────────────────────────────────
  describe('removeLatestBot', () => {
    it('returns null when there are no bots', () => {
      const { bm } = makeManagers()
      expect(bm.removeLatestBot()).toBeNull()
    })

    it('removes idle bot without returning an order', () => {
      const { bm } = makeManagers()
      const bot = bm.addBot()
      const result = bm.removeLatestBot()
      expect(result.bot.id).toBe(bot.id)
      expect(result.returnedOrder).toBeNull()
      expect(bm.bots.length).toBe(0)
    })

    it('removes working bot and returns its order to the queue', () => {
      const { om, bm } = makeManagers()
      om.addNormalOrder()
      bm.addBot()  // picks the order
      const result = bm.removeLatestBot()
      expect(result.returnedOrder).not.toBeNull()
      expect(result.returnedOrder.status).toBe('pending')
      expect(om.getQueueSnapshot().length).toBe(1)
    })

    it('cancels the processing timer on removal', () => {
      const { om, bm } = makeManagers()
      const completedSpy = jest.fn()
      bm.onOrderCompleted = completedSpy
      om.addNormalOrder()
      bm.addBot()
      bm.removeLatestBot()
      jest.runAllTimers()
      expect(completedSpy).not.toHaveBeenCalled()
    })
  })

  // ── notifyNewOrder ────────────────────────────────────────────────────────
  describe('notifyNewOrder', () => {
    it('assigns a pending order to an idle bot', () => {
      const { om, bm } = makeManagers()
      const bot = bm.addBot()  // idle (no orders yet)
      expect(bot.status).toBe('idle')

      om.addNormalOrder()
      bm.notifyNewOrder()

      expect(bot.status).toBe('working')
    })

    it('assigns only one order per call (to the earliest idle bot)', () => {
      const { om, bm } = makeManagers()
      const b1 = bm.addBot()
      const b2 = bm.addBot()

      om.addNormalOrder()  // #1
      om.addNormalOrder()  // #2
      bm.notifyNewOrder()  // only one bot should get one order

      const working = [b1, b2].filter(b => b.status === 'working')
      expect(working.length).toBe(1)
    })
  })

  // ── order completion ───────────────────────────────────────────────────────
  describe('order completion', () => {
    it('fires onOrderCompleted callback after processing time', () => {
      const { om, bm } = makeManagers(3000)
      const completedSpy = jest.fn()
      bm.onOrderCompleted = completedSpy
      om.addNormalOrder()
      bm.addBot()

      expect(completedSpy).not.toHaveBeenCalled()
      jest.advanceTimersByTime(3000)
      expect(completedSpy).toHaveBeenCalledTimes(1)
    })

    it('bot picks up next pending order automatically after completing one', () => {
      const { om, bm } = makeManagers(3000)
      om.addNormalOrder()  // #1
      om.addNormalOrder()  // #2
      const bot = bm.addBot()  // picks #1

      jest.advanceTimersByTime(3000)  // #1 done, bot picks #2
      expect(bot.status).toBe('working')
      expect(bot.currentOrder.id).toBe(2)
    })

    it('moves completed order to completed list', () => {
      const { om, bm } = makeManagers(1000)
      om.addNormalOrder()
      bm.addBot()
      jest.advanceTimersByTime(1000)
      expect(om.getCompletedSnapshot().length).toBe(1)
      expect(om.getQueueSnapshot().length).toBe(0)
    })
  })

  // ── multiple bots ─────────────────────────────────────────────────────────
  describe('multiple bots concurrency', () => {
    it('processes multiple orders in parallel', () => {
      const { om, bm } = makeManagers(5000)
      const completedSpy = jest.fn()
      bm.onOrderCompleted = completedSpy

      om.addNormalOrder()
      om.addNormalOrder()
      om.addNormalOrder()
      bm.addBot()
      bm.addBot()

      jest.advanceTimersByTime(5000)  // 2 orders done simultaneously
      expect(completedSpy).toHaveBeenCalledTimes(2)

      jest.advanceTimersByTime(5000)  // 3rd order done
      expect(completedSpy).toHaveBeenCalledTimes(3)
    })
  })
})
