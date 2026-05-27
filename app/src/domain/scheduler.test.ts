import {
  ORDER_PROCESSING_MS,
  addBot,
  addOrder,
  createInitialState,
  removeNewestBot,
  selectCompleteOrders,
  selectPendingOrders,
  tick,
} from './scheduler'

describe('scheduler', () => {
  it('keeps one increasing order sequence across normal and VIP orders', () => {
    const state = addOrder(addOrder(addOrder(createInitialState(), 'NORMAL', 1), 'VIP', 2), 'NORMAL', 3)

    expect(state.orders.map((order) => order.id)).toEqual([1, 2, 3])
    expect(state.nextOrderId).toBe(4)
  })

  it('prioritizes VIP orders while preserving FIFO inside each priority', () => {
    const state = [
      { type: 'NORMAL' as const, now: 1 },
      { type: 'NORMAL' as const, now: 2 },
      { type: 'VIP' as const, now: 3 },
      { type: 'VIP' as const, now: 4 },
    ].reduce((currentState, order) => addOrder(currentState, order.type, order.now), createInitialState())

    expect(selectPendingOrders(state.orders).map((order) => order.id)).toEqual([3, 4, 1, 2])
  })

  it('assigns pending orders to idle bots and completes work after ten seconds', () => {
    const withOrder = addOrder(createInitialState(), 'VIP', 100)
    const processing = addBot(withOrder, 200)

    expect(selectPendingOrders(processing.orders)).toHaveLength(0)
    expect(processing.bots[0]).toMatchObject({
      id: 1,
      status: 'PROCESSING',
      currentOrderId: 1,
    })

    const completed = tick(processing, 200 + ORDER_PROCESSING_MS)

    expect(selectCompleteOrders(completed.orders).map((order) => order.id)).toEqual([1])
    expect(completed.bots[0]).toMatchObject({ id: 1, status: 'IDLE' })
  })

  it('continues with the next highest priority order after a completion', () => {
    const queued = [
      { type: 'NORMAL' as const, now: 100 },
      { type: 'VIP' as const, now: 200 },
    ].reduce((currentState, order) => addOrder(currentState, order.type, order.now), createInitialState())
    const processing = addBot(queued, 300)
    const afterFirstComplete = tick(processing, 300 + ORDER_PROCESSING_MS)

    expect(selectCompleteOrders(afterFirstComplete.orders).map((order) => order.id)).toEqual([2])
    expect(afterFirstComplete.bots[0]).toMatchObject({
      status: 'PROCESSING',
      currentOrderId: 1,
    })
  })

  it('removes the newest bot and returns its interrupted order to the pending queue', () => {
    const queued = [
      { type: 'NORMAL' as const, now: 100 },
      { type: 'VIP' as const, now: 200 },
    ].reduce((currentState, order) => addOrder(currentState, order.type, order.now), createInitialState())
    const withFirstBot = addBot(queued, 300)
    const withSecondBot = addBot(withFirstBot, 400)
    const afterRemoval = removeNewestBot(withSecondBot)

    expect(afterRemoval.bots.map((bot) => bot.id)).toEqual([1])
    expect(selectPendingOrders(afterRemoval.orders).map((order) => order.id)).toEqual([1])
    expect(afterRemoval.orders.find((order) => order.id === 1)).toMatchObject({
      status: 'PENDING',
      startedAt: undefined,
    })
  })
})
