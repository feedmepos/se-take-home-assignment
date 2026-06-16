import { describe, it, expect } from 'vitest'
import { orderReducer, initialState } from './orderReducer'

describe('ADD_NORMAL_ORDER', () => {
  it('adds order at end of pending list', () => {
    const state = orderReducer(initialState, { type: 'ADD_NORMAL_ORDER' })
    expect(state.orders).toHaveLength(1)
    expect(state.orders[0]).toMatchObject({ id: 1, type: 'NORMAL', status: 'PENDING', startedAt: null })
  })

  it('increments nextOrderId', () => {
    const state = orderReducer(initialState, { type: 'ADD_NORMAL_ORDER' })
    expect(state.nextOrderId).toBe(2)
  })

  it('order IDs are unique and increasing', () => {
    let state = orderReducer(initialState, { type: 'ADD_NORMAL_ORDER' })
    state = orderReducer(state, { type: 'ADD_NORMAL_ORDER' })
    state = orderReducer(state, { type: 'ADD_VIP_ORDER' })
    expect(state.orders.map(o => o.id).sort((a, b) => a - b)).toEqual([1, 2, 3])
  })
})

describe('ADD_VIP_ORDER', () => {
  it('inserts VIP order before all Normal orders', () => {
    let state = orderReducer(initialState, { type: 'ADD_NORMAL_ORDER' }) // #1 Normal
    state = orderReducer(state, { type: 'ADD_VIP_ORDER' })               // #2 VIP
    const pending = state.orders.filter(o => o.status === 'PENDING')
    expect(pending[0]).toMatchObject({ id: 2, type: 'VIP' })
    expect(pending[1]).toMatchObject({ id: 1, type: 'NORMAL' })
  })

  it('inserts VIP behind existing VIP orders', () => {
    let state = orderReducer(initialState, { type: 'ADD_VIP_ORDER' })    // #1 VIP
    state = orderReducer(state, { type: 'ADD_NORMAL_ORDER' })            // #2 Normal
    state = orderReducer(state, { type: 'ADD_VIP_ORDER' })               // #3 VIP
    const pending = state.orders.filter(o => o.status === 'PENDING')
    expect(pending.map(o => o.id)).toEqual([1, 3, 2])
  })

  it('VIP order goes to front when no existing VIPs', () => {
    let state = orderReducer(initialState, { type: 'ADD_NORMAL_ORDER' }) // #1 Normal
    state = orderReducer(state, { type: 'ADD_NORMAL_ORDER' })            // #2 Normal
    state = orderReducer(state, { type: 'ADD_VIP_ORDER' })               // #3 VIP
    const pending = state.orders.filter(o => o.status === 'PENDING')
    expect(pending[0]).toMatchObject({ id: 3, type: 'VIP' })
  })
})

describe('ADD_BOT', () => {
  it('creates bot in IDLE state when no pending orders', () => {
    const state = orderReducer(initialState, { type: 'ADD_BOT' })
    expect(state.bots).toHaveLength(1)
    expect(state.bots[0]).toMatchObject({ id: 1, status: 'IDLE', processingOrderId: null })
    expect(state.nextBotId).toBe(2)
  })

  it('bot immediately picks pending order on creation', () => {
    let state = orderReducer(initialState, { type: 'ADD_NORMAL_ORDER' })
    state = orderReducer(state, { type: 'ADD_BOT' })
    expect(state.bots[0].status).toBe('PROCESSING')
    expect(state.bots[0].processingOrderId).toBe(1)
    expect(state.orders[0].status).toBe('PROCESSING')
    expect(state.orders[0].startedAt).not.toBeNull()
  })

  it('new order immediately picked by IDLE bot', () => {
    let state = orderReducer(initialState, { type: 'ADD_BOT' })
    state = orderReducer(state, { type: 'ADD_NORMAL_ORDER' })
    expect(state.bots[0].status).toBe('PROCESSING')
    expect(state.bots[0].processingOrderId).toBe(1)
  })
})

describe('REMOVE_BOT', () => {
  it('does nothing when no bots', () => {
    const state = orderReducer(initialState, { type: 'REMOVE_BOT' })
    expect(state.bots).toHaveLength(0)
  })

  it('removes the highest-ID bot', () => {
    let state = orderReducer(initialState, { type: 'ADD_BOT' }) // bot 1
    state = orderReducer(state, { type: 'ADD_BOT' })             // bot 2
    state = orderReducer(state, { type: 'REMOVE_BOT' })
    expect(state.bots).toHaveLength(1)
    expect(state.bots[0].id).toBe(1)
  })

  it('returns VIP processing order to front of PENDING queue', () => {
    let state = orderReducer(initialState, { type: 'ADD_VIP_ORDER' })   // #1 VIP
    state = orderReducer(state, { type: 'ADD_NORMAL_ORDER' })            // #2 Normal
    state = orderReducer(state, { type: 'ADD_BOT' })                     // bot1 picks #1 VIP
    state = orderReducer(state, { type: 'REMOVE_BOT' })
    const pending = state.orders.filter(o => o.status === 'PENDING')
    expect(pending[0]).toMatchObject({ id: 1, type: 'VIP', status: 'PENDING', startedAt: null })
    expect(pending[1]).toMatchObject({ id: 2, type: 'NORMAL' })
    expect(state.bots).toHaveLength(0)
  })

  it('returns Normal processing order to end of PENDING queue', () => {
    let state = orderReducer(initialState, { type: 'ADD_VIP_ORDER' })   // #1 VIP
    state = orderReducer(state, { type: 'ADD_NORMAL_ORDER' })            // #2 Normal
    state = orderReducer(state, { type: 'ADD_BOT' })                     // bot1 picks #1 VIP
    state = orderReducer(state, { type: 'ADD_BOT' })                     // bot2 picks #2 Normal
    state = orderReducer(state, { type: 'REMOVE_BOT' })                  // removes bot2 (#2 Normal returns)
    const pending = state.orders.filter(o => o.status === 'PENDING')
    expect(pending[pending.length - 1]).toMatchObject({ id: 2, type: 'NORMAL', startedAt: null })
  })

  it('removing VIP-processing bot triggers preemption of most-bottom Normal bot', () => {
    let state = orderReducer(initialState, { type: 'ADD_NORMAL_ORDER' }) // #1 Normal
    state = orderReducer(state, { type: 'ADD_NORMAL_ORDER' })             // #2 Normal
    state = orderReducer(state, { type: 'ADD_BOT' })                      // bot1 picks #1
    state = orderReducer(state, { type: 'ADD_BOT' })                      // bot2 picks #2
    state = orderReducer(state, { type: 'ADD_BOT' })                      // bot3 idle
    state = orderReducer(state, { type: 'ADD_VIP_ORDER' })                // #3 VIP → bot3 picks it
    expect(state.bots.find(b => b.id === 3)?.processingOrderId).toBe(3)
    state = orderReducer(state, { type: 'REMOVE_BOT' })                   // remove bot3 → VIP#3 returns to PENDING
    // bot2 is processing #2 (last/most-bottom Normal) → should preempt and take VIP#3
    expect(state.bots.find(b => b.id === 2)?.processingOrderId).toBe(3)
    expect(state.orders.find(o => o.id === 2)?.status).toBe('PENDING')
    expect(state.orders.find(o => o.id === 3)?.status).toBe('PROCESSING')
  })
})

describe('ORDER_COMPLETE', () => {
  it('marks order COMPLETE and bot goes IDLE when no more pending', () => {
    let state = orderReducer(initialState, { type: 'ADD_NORMAL_ORDER' })
    state = orderReducer(state, { type: 'ADD_BOT' })
    state = orderReducer(state, { type: 'ORDER_COMPLETE', botId: 1 })
    expect(state.orders[0].status).toBe('COMPLETE')
    expect(state.orders[0].startedAt).toBeNull()
    expect(state.bots[0]).toMatchObject({ status: 'IDLE', processingOrderId: null })
  })

  it('bot picks next pending order after completing one', () => {
    let state = orderReducer(initialState, { type: 'ADD_NORMAL_ORDER' }) // #1
    state = orderReducer(state, { type: 'ADD_NORMAL_ORDER' })             // #2
    state = orderReducer(state, { type: 'ADD_BOT' })                      // bot picks #1
    state = orderReducer(state, { type: 'ORDER_COMPLETE', botId: 1 })
    expect(state.orders.find(o => o.id === 1)?.status).toBe('COMPLETE')
    expect(state.orders.find(o => o.id === 2)?.status).toBe('PROCESSING')
    expect(state.bots[0]).toMatchObject({ status: 'PROCESSING', processingOrderId: 2 })
  })

  it('bot preempts normal order immediately when VIP order is added', () => {
    let state = orderReducer(initialState, { type: 'ADD_NORMAL_ORDER' }) // #1 Normal
    state = orderReducer(state, { type: 'ADD_BOT' })                      // bot picks #1
    state = orderReducer(state, { type: 'ADD_NORMAL_ORDER' })             // #2 Normal → pending
    state = orderReducer(state, { type: 'ADD_VIP_ORDER' })                // #3 VIP → preempts bot off #1
    // Bot should immediately be processing VIP #3 (preemption, not waiting for #1 to finish)
    expect(state.bots[0].processingOrderId).toBe(3)
    expect(state.orders.find(o => o.id === 3)?.status).toBe('PROCESSING')
    // Normal #1 should be returned to pending
    expect(state.orders.find(o => o.id === 1)?.status).toBe('PENDING')
    // After VIP finishes, bot picks the next pending normal order
    state = orderReducer(state, { type: 'ORDER_COMPLETE', botId: 1 })
    expect(state.bots[0].processingOrderId).toBe(2)
  })

  it('order IDs are unique and increasing across all actions', () => {
    let state = orderReducer(initialState, { type: 'ADD_NORMAL_ORDER' })
    state = orderReducer(state, { type: 'ADD_NORMAL_ORDER' })
    state = orderReducer(state, { type: 'ADD_VIP_ORDER' })
    const ids = state.orders.map(o => o.id)
    expect(new Set(ids).size).toBe(3)
    expect(Math.max(...ids)).toBe(3)
    expect(Math.min(...ids)).toBe(1)
  })
})
