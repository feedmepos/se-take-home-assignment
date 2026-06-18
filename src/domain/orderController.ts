export const PROCESSING_MS = 10_000

export type OrderKind = 'normal' | 'vip'

export type Order = {
  id: number
  kind: OrderKind
}

export type CompletedOrder = Order & {
  completedAt: number
}

export type ProcessingOrder = {
  order: Order
  startedAt: number
  completesAt: number
}

export type Bot = {
  id: number
  processing: ProcessingOrder | null
}

export type OrderControllerState = {
  nextOrderId: number
  nextBotId: number
  vipQueue: Order[]
  normalQueue: Order[]
  bots: Bot[]
  completedOrders: CompletedOrder[]
}

export type ControllerAction =
  | { type: 'add-order'; kind: OrderKind; now: number }
  | { type: 'add-bot'; now: number }
  | { type: 'remove-newest-bot' }
  | { type: 'complete-bot-order'; botId: number; completesAt: number; now: number }
  | { type: 'reset' }

export function createInitialState(): OrderControllerState {
  return {
    nextOrderId: 1,
    nextBotId: 1,
    vipQueue: [],
    normalQueue: [],
    bots: [],
    completedOrders: [],
  }
}

export function orderControllerReducer(
  state: OrderControllerState,
  action: ControllerAction,
): OrderControllerState {
  switch (action.type) {
    case 'add-order':
      return assignOrders(addOrder(state, action.kind), action.now)
    case 'add-bot':
      return assignOrders(addBot(state), action.now)
    case 'remove-newest-bot':
      return removeNewestBot(state)
    case 'complete-bot-order':
      return completeBotOrder(state, action.botId, action.completesAt, action.now)
    case 'reset':
      return createInitialState()
    default:
      return state
  }
}

export function addOrder(
  state: OrderControllerState,
  kind: OrderKind,
): OrderControllerState {
  const order = { id: state.nextOrderId, kind }

  return {
    ...state,
    nextOrderId: state.nextOrderId + 1,
    vipQueue: kind === 'vip' ? [...state.vipQueue, order] : state.vipQueue,
    normalQueue:
      kind === 'normal' ? [...state.normalQueue, order] : state.normalQueue,
  }
}

export function addBot(state: OrderControllerState): OrderControllerState {
  return {
    ...state,
    nextBotId: state.nextBotId + 1,
    bots: [...state.bots, { id: state.nextBotId, processing: null }],
  }
}

export function removeNewestBot(
  state: OrderControllerState,
): OrderControllerState {
  const bot = state.bots.at(-1)

  if (!bot) {
    return state
  }

  const remainingBots = state.bots.slice(0, -1)

  if (!bot.processing) {
    return {
      ...state,
      bots: remainingBots,
    }
  }

  const pending = returnOrderToQueue(state, bot.processing.order)

  return {
    ...pending,
    bots: remainingBots,
  }
}

export function completeBotOrder(
  state: OrderControllerState,
  botId: number,
  completesAt: number,
  now: number,
): OrderControllerState {
  const bot = state.bots.find((item) => item.id === botId)

  if (!bot?.processing || bot.processing.completesAt !== completesAt) {
    return state
  }

  const completedOrder: CompletedOrder = {
    ...bot.processing.order,
    completedAt: now,
  }

  const completedState = {
    ...state,
    bots: state.bots.map((item) =>
      item.id === botId ? { ...item, processing: null } : item,
    ),
    completedOrders: [...state.completedOrders, completedOrder],
  }

  return assignOrders(completedState, now)
}

export function assignOrders(
  state: OrderControllerState,
  now: number,
): OrderControllerState {
  let nextState = state
  const bots = nextState.bots.map((bot) => {
    if (bot.processing) {
      return bot
    }

    const result = takeNextOrder(nextState)

    if (!result.order) {
      return bot
    }

    nextState = result.state

    return {
      ...bot,
      processing: {
        order: result.order,
        startedAt: now,
        completesAt: now + PROCESSING_MS,
      },
    }
  })

  return {
    ...nextState,
    bots,
  }
}

export function getPendingOrders(state: OrderControllerState): Order[] {
  return [...state.vipQueue, ...state.normalQueue]
}

export function getProcessingOrders(state: OrderControllerState): Order[] {
  return state.bots.flatMap((bot) =>
    bot.processing ? [bot.processing.order] : [],
  )
}

function takeNextOrder(state: OrderControllerState): {
  state: OrderControllerState
  order: Order | null
} {
  const vipOrder = state.vipQueue[0]

  if (vipOrder) {
    return {
      state: {
        ...state,
        vipQueue: state.vipQueue.slice(1),
      },
      order: vipOrder,
    }
  }

  const normalOrder = state.normalQueue[0]

  if (normalOrder) {
    return {
      state: {
        ...state,
        normalQueue: state.normalQueue.slice(1),
      },
      order: normalOrder,
    }
  }

  return {
    state,
    order: null,
  }
}

function returnOrderToQueue(
  state: OrderControllerState,
  order: Order,
): OrderControllerState {
  if (order.kind === 'vip') {
    return {
      ...state,
      vipQueue: insertById(state.vipQueue, order),
    }
  }

  return {
    ...state,
    normalQueue: insertById(state.normalQueue, order),
  }
}

function insertById(queue: Order[], order: Order): Order[] {
  const index = queue.findIndex((item) => item.id > order.id)

  if (index === -1) {
    return [...queue, order]
  }

  return [...queue.slice(0, index), order, ...queue.slice(index)]
}
