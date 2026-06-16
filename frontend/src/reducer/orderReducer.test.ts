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
