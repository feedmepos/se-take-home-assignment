import {
  PROCESSING_MS,
  addBot,
  addOrder,
  assignOrders,
  completeBotOrder,
  createInitialState,
  getPendingOrders,
  removeNewestBot,
} from './orderController'

describe('order controller', () => {
  it('queues VIP orders before normal orders while preserving FIFO within each queue', () => {
    let state = createInitialState()

    state = addOrder(state, 'normal')
    state = addOrder(state, 'vip')
    state = addOrder(state, 'normal')
    state = addOrder(state, 'vip')

    expect(getPendingOrders(state).map((order) => order.id)).toEqual([
      2, 4, 1, 3,
    ])
  })

  it('assigns idle bots immediately from the pending queues', () => {
    let state = createInitialState()

    state = addOrder(state, 'normal')
    state = addOrder(state, 'vip')
    state = addBot(state)
    state = assignOrders(state, 1_000)

    expect(state.bots[0].processing?.order).toMatchObject({
      id: 2,
      kind: 'vip',
    })
    expect(getPendingOrders(state).map((order) => order.id)).toEqual([1])
  })

  it('moves completed orders to complete and assigns the bot another pending order', () => {
    let state = createInitialState()

    state = addOrder(state, 'normal')
    state = addOrder(state, 'normal')
    state = addBot(state)
    state = assignOrders(state, 5_000)

    state = completeBotOrder(state, 1, 5_000 + PROCESSING_MS, 15_000)

    expect(state.completedOrders.map((order) => order.id)).toEqual([1])
    expect(state.bots[0].processing?.order.id).toBe(2)
    expect(state.bots[0].processing?.startedAt).toBe(15_000)
  })

  it('removes the newest idle bot without changing queues', () => {
    let state = createInitialState()

    state = addBot(state)
    state = addBot(state)
    state = removeNewestBot(state)

    expect(state.bots.map((bot) => bot.id)).toEqual([1])
    expect(getPendingOrders(state)).toEqual([])
  })

  it('returns a canceled processing order to its priority queue by order id', () => {
    let state = createInitialState()

    state = addOrder(state, 'vip')
    state = addOrder(state, 'vip')
    state = addOrder(state, 'vip')
    state = addBot(state)
    state = addBot(state)
    state = assignOrders(state, 1_000)

    expect(getPendingOrders(state).map((order) => order.id)).toEqual([3])

    state = removeNewestBot(state)

    expect(state.bots.map((bot) => bot.id)).toEqual([1])
    expect(getPendingOrders(state).map((order) => order.id)).toEqual([2, 3])

    state = removeNewestBot(state)

    expect(state.bots).toEqual([])
    expect(getPendingOrders(state).map((order) => order.id)).toEqual([1, 2, 3])
  })

  it('keeps VIP priority when a normal order is canceled after a VIP arrives', () => {
    let state = createInitialState()

    state = addOrder(state, 'normal')
    state = addOrder(state, 'normal')
    state = addBot(state)
    state = assignOrders(state, 1_000)
    state = addOrder(state, 'vip')
    state = removeNewestBot(state)

    expect(getPendingOrders(state).map((order) => order.id)).toEqual([3, 1, 2])
  })

  it('ignores stale completion events after a bot was removed', () => {
    let state = createInitialState()

    state = addOrder(state, 'normal')
    state = addBot(state)
    state = assignOrders(state, 1_000)
    state = removeNewestBot(state)
    state = completeBotOrder(state, 1, 11_000, 11_000)

    expect(state.completedOrders).toEqual([])
    expect(getPendingOrders(state).map((order) => order.id)).toEqual([1])
  })
})
