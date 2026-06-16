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
})
