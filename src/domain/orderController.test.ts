import {
  initialState,
  insertPendingOrder,
  orderControllerReducer,
  type Order,
} from './orderController'

describe('insertPendingOrder', () => {
  it('puts VIP orders behind existing VIP orders and before normal orders', () => {
    const pendingOrders: Order[] = [
      { id: 1, priority: 'VIP', status: 'PENDING' },
      { id: 2, priority: 'NORMAL', status: 'PENDING' },
      { id: 3, priority: 'NORMAL', status: 'PENDING' },
    ]

    const result = insertPendingOrder(pendingOrders, {
      id: 4,
      priority: 'VIP',
      status: 'PENDING',
    })

    expect(result.map((order) => order.id)).toEqual([1, 4, 2, 3])
  })

  it('appends normal orders to the end of the pending queue', () => {
    const pendingOrders: Order[] = [
      { id: 1, priority: 'VIP', status: 'PENDING' },
      { id: 2, priority: 'NORMAL', status: 'PENDING' },
    ]

    const result = insertPendingOrder(pendingOrders, {
      id: 3,
      priority: 'NORMAL',
      status: 'PENDING',
    })

    expect(result.map((order) => order.id)).toEqual([1, 2, 3])
  })
})

describe('orderControllerReducer', () => {
  it('creates strictly increasing order ids', () => {
    let state = orderControllerReducer(initialState, {
      type: 'create_order',
      priority: 'NORMAL',
    })

    state = orderControllerReducer(state, {
      type: 'create_order',
      priority: 'VIP',
    })

    expect([...state.pendingOrders, ...state.processingOrders].map((order) => order.id)).toEqual([2, 1])
    expect(state.nextOrderId).toBe(3)
  })

  it('assigns pending work immediately when a bot is added', () => {
    let state = orderControllerReducer(initialState, {
      type: 'create_order',
      priority: 'NORMAL',
    })

    state = orderControllerReducer(state, { type: 'add_bot' })

    expect(state.pendingOrders).toHaveLength(0)
    expect(state.processingOrders.map((order) => order.id)).toEqual([1])
    expect(state.bots[0]).toMatchObject({ id: 1, status: 'PROCESSING', activeOrderId: 1 })
  })

  it('removes the newest idle bot without affecting orders', () => {
    let state = orderControllerReducer(initialState, { type: 'add_bot' })
    state = orderControllerReducer(state, { type: 'add_bot' })

    state = orderControllerReducer(state, { type: 'remove_bot' })

    expect(state.bots.map((bot) => bot.id)).toEqual([1])
    expect(state.pendingOrders).toHaveLength(0)
    expect(state.processingOrders).toHaveLength(0)
  })

  it('returns an interrupted order to pending with VIP priority preserved', () => {
    let state = orderControllerReducer(initialState, {
      type: 'create_order',
      priority: 'VIP',
    })
    state = orderControllerReducer(state, {
      type: 'create_order',
      priority: 'NORMAL',
    })
    state = orderControllerReducer(state, {
      type: 'create_order',
      priority: 'NORMAL',
    })
    state = orderControllerReducer(state, { type: 'add_bot' })
    state = orderControllerReducer(state, { type: 'add_bot' })

    state = orderControllerReducer(state, { type: 'remove_bot' })

    expect(state.bots).toHaveLength(1)
    expect(state.processingOrders.map((order) => order.id)).toEqual([1])
    expect(state.pendingOrders.map((order) => order.id)).toEqual([3, 2])
  })

  it('completes an order and frees the bot', () => {
    let state = orderControllerReducer(initialState, {
      type: 'create_order',
      priority: 'NORMAL',
    })
    state = orderControllerReducer(state, { type: 'add_bot' })

    state = orderControllerReducer(state, {
      type: 'complete_order',
      botId: 1,
      orderId: 1,
    })

    expect(state.completedOrders.map((order) => order.id)).toEqual([1])
    expect(state.processingOrders).toHaveLength(0)
    expect(state.bots[0]).toMatchObject({ id: 1, status: 'IDLE', activeOrderId: null })
  })
})
