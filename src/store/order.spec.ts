import { setActivePinia, createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PROCESS_DURATION_MS, useOrderStore } from './order'

function ids(list: { id: number; type: string }[]): string {
  return list.map(o => `${o.type[0]}${o.id}`).join(',')
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useOrderStore - R1 / R2 / R3 (order creation)', () => {
  it('R1: three Normal orders queue in FIFO order', () => {
    const store = useOrderStore()
    store.addNormal()
    store.addNormal()
    store.addNormal()
    expect(ids(store.pending)).toBe('N1,N2,N3')
  })

  it('R2: VIP jumps in front of Normal but behind existing VIP', () => {
    const store = useOrderStore()
    store.addNormal()
    store.addVip()
    expect(ids(store.pending)).toBe('V2,N1')

    store.addNormal()
    store.addVip()
    expect(ids(store.pending)).toBe('V2,V4,N1,N3')
  })

  it('R3: ids are unique and monotonically increasing across removeBot/finish', async () => {
    const store = useOrderStore()
    store.addBot()
    store.addNormal()       // N1 -> dispatched to bot
    store.addNormal()       // N2 -> pending
    await vi.advanceTimersByTimeAsync(PROCESS_DURATION_MS)
    expect(store.completed.map(o => o.id)).toEqual([1])

    store.removeBot()       // bot is processing N2, kill -> N2 returns
    expect(ids(store.pending)).toBe('N2')

    store.addVip()          // must be id=3, NEVER reuses removed ids
    expect(store.pending.map(o => o.id)).toEqual([3, 2])
  })
})

describe('useOrderStore - R4 / R5 (bot processing)', () => {
  it('R4: +Bot grabs the head of pending and completes after PROCESS_DURATION', async () => {
    const store = useOrderStore()
    store.addNormal()
    store.addBot()
    expect(store.bots[0]?.status).toBe('BUSY')
    expect(store.pending.length).toBe(0)

    await vi.advanceTimersByTimeAsync(PROCESS_DURATION_MS)
    expect(store.completed.length).toBe(1)
    expect(store.completed[0]?.id).toBe(1)
    expect(store.bots[0]?.status).toBe('IDLE')
  })

  it('R4: bot picks the next pending order after finishing the current one', async () => {
    const store = useOrderStore()
    store.addNormal()       // N1
    store.addNormal()       // N2
    store.addBot()
    expect(store.bots[0]?.orderId).toBe(1)

    await vi.advanceTimersByTimeAsync(PROCESS_DURATION_MS)
    expect(store.completed.map(o => o.id)).toEqual([1])
    expect(store.bots[0]?.status).toBe('BUSY')
    expect(store.bots[0]?.orderId).toBe(2)

    await vi.advanceTimersByTimeAsync(PROCESS_DURATION_MS)
    expect(store.completed.map(o => o.id)).toEqual([1, 2])
    expect(store.bots[0]?.status).toBe('IDLE')
  })

  it('two Bots process two pending orders in parallel; third waits', async () => {
    const store = useOrderStore()
    store.addNormal()
    store.addNormal()
    store.addNormal()
    store.addBot()
    store.addBot()
    expect(store.bots.map(b => b.orderId)).toEqual([1, 2])
    expect(ids(store.pending)).toBe('N3')

    await vi.advanceTimersByTimeAsync(PROCESS_DURATION_MS)
    expect(store.completed.map(o => o.id).sort()).toEqual([1, 2])
    // one bot should now be processing N3, the other IDLE
    const busyOrders = store.bots.filter(b => b.status === 'BUSY').map(b => b.orderId)
    const idleCount = store.bots.filter(b => b.status === 'IDLE').length
    expect(busyOrders).toEqual([3])
    expect(idleCount).toBe(1)
  })

  it('R5: idle bot stays IDLE until a new order comes in', async () => {
    const store = useOrderStore()
    store.addBot()
    expect(store.bots[0]?.status).toBe('IDLE')

    await vi.advanceTimersByTimeAsync(PROCESS_DURATION_MS * 2)
    expect(store.bots[0]?.status).toBe('IDLE')

    store.addNormal()
    expect(store.bots[0]?.status).toBe('BUSY')
  })

  it('newly added bot immediately picks up an existing pending order', () => {
    const store = useOrderStore()
    store.addNormal()
    store.addNormal()
    store.addNormal()
    store.addBot()
    expect(store.bots[0]?.orderId).toBe(1)
    expect(ids(store.pending)).toBe('N2,N3')
  })

  it('with zero bots, every new order stays pending forever', async () => {
    const store = useOrderStore()
    store.addNormal()
    store.addVip()
    store.addNormal()
    await vi.advanceTimersByTimeAsync(PROCESS_DURATION_MS * 3)
    expect(store.completed.length).toBe(0)
    expect(store.pending.length).toBe(3)
  })
})

describe('useOrderStore - R6 (removeBot returns order to original position)', () => {
  it('removeBot LIFO: destroys the newest bot', () => {
    const store = useOrderStore()
    store.addBot()        // bot#1
    store.addBot()        // bot#2
    store.removeBot()
    expect(store.bots.map(b => b.id)).toEqual([1])
  })

  it('IDLE bot is removed without touching any order', () => {
    const store = useOrderStore()
    store.addNormal()
    store.addBot()
    store.addBot()        // newest is IDLE because only 1 pending
    expect(store.pending.length).toBe(0)

    store.removeBot()     // remove the IDLE one
    expect(store.bots.length).toBe(1)
    expect(store.bots[0]?.status).toBe('BUSY')
    expect(store.pending.length).toBe(0)
  })

  it('R6a: VIP returns to head of VIP group when bot is destroyed', () => {
    const store = useOrderStore()
    store.addBot()
    store.addVip()        // V1 -> taken by bot
    store.addVip()        // V2 -> pending
    store.addVip()        // V3 -> pending
    expect(store.bots[0]?.orderId).toBe(1)
    expect(ids(store.pending)).toBe('V2,V3')

    store.removeBot()     // V1 returns
    expect(ids(store.pending)).toBe('V1,V2,V3')
    expect(store.bots.length).toBe(0)
  })

  it('R6b: Normal returns to head of Normal group, still behind VIPs', () => {
    const store = useOrderStore()
    store.addBot()
    store.addNormal()     // N1 -> taken
    store.addVip()        // V2 -> pending (jumps to front of queue)
    store.addNormal()     // N3 -> pending (behind V2)
    expect(store.bots[0]?.orderId).toBe(1)
    expect(ids(store.pending)).toBe('V2,N3')

    store.removeBot()     // N1 returns -> behind V2, before N3
    expect(ids(store.pending)).toBe('V2,N1,N3')
  })

  it('R6c: removing one BUSY bot keeps the other bot working; returned order is not immediately picked up', () => {
    const store = useOrderStore()
    store.addBot()        // bot#1
    store.addBot()        // bot#2
    store.addVip()        // V1 -> bot#1
    store.addVip()        // V2 -> bot#2
    expect(store.bots.map(b => b.orderId)).toEqual([1, 2])

    store.removeBot()     // newest bot#2 destroyed, V2 returns
    expect(store.bots.length).toBe(1)
    expect(store.bots[0]?.id).toBe(1)
    expect(store.bots[0]?.orderId).toBe(1)
    expect(ids(store.pending)).toBe('V2')
  })

  it('R6 + R3: a destroyed bot’s timer must NOT fire and accidentally complete the order', async () => {
    const store = useOrderStore()
    store.addBot()
    store.addNormal()
    expect(store.bots[0]?.status).toBe('BUSY')
    store.removeBot()
    await vi.advanceTimersByTimeAsync(PROCESS_DURATION_MS * 3)
    expect(store.completed.length).toBe(0)
    expect(store.pending.length).toBe(1)
    expect(store.pending[0]?.status).toBe('PENDING')
  })

  it('R6 invariant: after removing the newest BUSY bot, no IDLE bot is left to re-pick the order', () => {
    const store = useOrderStore()
    store.addBot()
    store.addBot()
    store.addBot()
    store.addNormal()
    store.addNormal()
    store.addNormal()
    // all 3 bots BUSY, pending empty
    expect(store.bots.every(b => b.status === 'BUSY')).toBe(true)
    expect(store.pending.length).toBe(0)

    store.removeBot()
    // returned order must stay in pending (no IDLE bot exists per invariant)
    expect(store.pending.length).toBe(1)
    expect(store.bots.every(b => b.status === 'BUSY')).toBe(true)
  })

  it('R6d: returned order is re-dispatched to an older IDLE bot (spec §4.3)', async () => {
    const store = useOrderStore()
    const HALF = PROCESS_DURATION_MS / 2
    store.addBot()          // bot#1
    store.addNormal()       // N1 -> bot#1 starts at t=0
    expect(store.bots[0]?.orderId).toBe(1)

    // half a cycle in: bot#1 still busy; add bot#2 + N2 so bot#2 starts later
    await vi.advanceTimersByTimeAsync(HALF)
    store.addBot()          // bot#2
    store.addNormal()       // N2 -> bot#2 starts at t=HALF
    expect(store.bots.find(b => b.id === 2)?.orderId).toBe(2)

    // bot#1 finishes N1 (full cycle elapsed), pending empty -> bot#1 IDLE; bot#2 still BUSY
    await vi.advanceTimersByTimeAsync(HALF)
    expect(store.bots.find(b => b.id === 1)?.status).toBe('IDLE')
    expect(store.bots.find(b => b.id === 2)?.status).toBe('BUSY')

    // remove newest BUSY bot#2 -> N2 returns AND must be re-dispatched to idle bot#1
    store.removeBot()
    expect(store.pending.length).toBe(0)
    expect(store.bots.length).toBe(1)
    expect(store.bots[0]?.id).toBe(1)
    expect(store.bots[0]?.status).toBe('BUSY')
    expect(store.bots[0]?.orderId).toBe(2)
  })

  it('removeBot on empty bot list is a no-op', () => {
    const store = useOrderStore()
    expect(() => store.removeBot()).not.toThrow()
    expect(store.bots.length).toBe(0)
  })

  it('Edge: removeBot beyond available bots stays safe and preserves pending', () => {
    const store = useOrderStore()
    store.addBot()
    store.addNormal()       // taken by bot
    store.removeBot()       // bot destroyed, N1 returns
    store.removeBot()       // no bots left -> no-op
    store.removeBot()       // still no-op
    expect(store.bots.length).toBe(0)
    expect(ids(store.pending)).toBe('N1')
    expect(store.completed.length).toBe(0)
  })

  it('Edge: returned order can be picked up by a freshly added bot', async () => {
    const store = useOrderStore()
    store.addBot()
    store.addVip()          // V1 -> bot
    store.removeBot()       // V1 returns to pending
    expect(ids(store.pending)).toBe('V1')

    store.addBot()          // new bot grabs V1
    expect(store.bots[0]?.orderId).toBe(1)
    expect(store.pending.length).toBe(0)

    await vi.advanceTimersByTimeAsync(PROCESS_DURATION_MS)
    expect(store.completed.map(o => o.id)).toEqual([1])
  })

  it('Edge: removing two BUSY bots in a row restores both orders in priority order', () => {
    const store = useOrderStore()
    store.addBot()          // bot#1
    store.addBot()          // bot#2
    store.addVip()          // V1 -> bot#1
    store.addVip()          // V2 -> bot#2
    store.addVip()          // V3 -> pending
    expect(ids(store.pending)).toBe('V3')

    store.removeBot()       // bot#2 destroyed, V2 returns
    expect(ids(store.pending)).toBe('V2,V3')
    store.removeBot()       // bot#1 destroyed, V1 returns
    expect(ids(store.pending)).toBe('V1,V2,V3')
    expect(store.bots.length).toBe(0)
  })
})

describe('useOrderStore - R7 + integration', () => {
  it('R7: state is in-memory, fresh pinia gives a fresh store', () => {
    const a = useOrderStore()
    a.addNormal()
    expect(a.pending.length).toBe(1)
    // simulate a fresh app run
    setActivePinia(createPinia())
    const b = useOrderStore()
    expect(b.pending.length).toBe(0)
    expect(b.orders.length).toBe(0)
  })

  it('VIP jumps in line even when a normal is already being processed', () => {
    const store = useOrderStore()
    store.addBot()
    store.addNormal()     // N1 -> taken
    store.addNormal()     // N2 -> pending
    store.addVip()        // V3 -> jumps ahead of N2 in pending
    expect(store.bots[0]?.orderId).toBe(1)
    expect(ids(store.pending)).toBe('V3,N2')
  })
})
