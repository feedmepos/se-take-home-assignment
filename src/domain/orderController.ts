export type OrderType = 'normal' | 'vip';

export type Order = {
  id: number;
  type: OrderType;
};

export type BotStatus = 'idle' | 'processing';

export type Bot = {
  id: number;
  status: BotStatus;
  order: Order | null;
};

export type ControllerState = {
  nextOrderId: number;
  nextBotId: number;
  pendingOrders: Order[];
  bots: Bot[];
  completedOrders: Order[];
};

export function createInitialState(): ControllerState {
  return {
    nextOrderId: 1,
    nextBotId: 1,
    pendingOrders: [],
    bots: [],
    completedOrders: [],
  };
}

export function addOrder(
  state: ControllerState,
  type: OrderType,
): ControllerState {
  const order: Order = { id: state.nextOrderId, type };

  return assignPendingOrders({
    ...state,
    nextOrderId: state.nextOrderId + 1,
    pendingOrders: insertPendingOrder(state.pendingOrders, order),
  });
}

export function addBot(state: ControllerState): ControllerState {
  const bot: Bot = {
    id: state.nextBotId,
    status: 'idle',
    order: null,
  };

  return assignPendingOrders({
    ...state,
    nextBotId: state.nextBotId + 1,
    bots: [...state.bots, bot],
  });
}

export function removeNewestBot(state: ControllerState): ControllerState {
  if (state.bots.length === 0) {
    return state;
  }

  const newestBot = state.bots[state.bots.length - 1];
  const newestBotId = newestBot.id;
  const remainingBots = state.bots.filter((bot) => bot.id !== newestBotId);
  const returnedOrders = newestBot.order
    ? insertPendingOrder(state.pendingOrders, newestBot.order)
    : state.pendingOrders;

  return assignPendingOrders({
    ...state,
    pendingOrders: returnedOrders,
    bots: remainingBots,
  });
}

export function completeBotOrder(
  state: ControllerState,
  botId: number,
  orderId: number,
): ControllerState {
  const bot = state.bots.find((candidate) => candidate.id === botId);

  if (
    !bot ||
    bot.status !== 'processing' ||
    !bot.order ||
    bot.order.id !== orderId
  ) {
    return state;
  }

  const completedOrder = bot.order;
  const bots = state.bots.map((candidate) =>
    candidate.id === botId
      ? { ...candidate, status: 'idle' as const, order: null }
      : candidate,
  );

  return assignPendingOrders({
    ...state,
    bots,
    completedOrders: [...state.completedOrders, completedOrder],
  });
}

export function assignPendingOrders(state: ControllerState): ControllerState {
  if (state.pendingOrders.length === 0 || state.bots.length === 0) {
    return state;
  }

  const hasIdleBot = state.bots.some((bot) => bot.status === 'idle');

  if (!hasIdleBot) {
    return state;
  }

  let nextPendingIndex = 0;
  let assignedAnyOrder = false;

  const bots = state.bots.map((bot) => {
    if (bot.status !== 'idle' || nextPendingIndex >= state.pendingOrders.length) {
      return bot;
    }

    const order = state.pendingOrders[nextPendingIndex];
    nextPendingIndex += 1;
    assignedAnyOrder = true;

    return {
      ...bot,
      status: 'processing' as const,
      order,
    };
  });

  if (!assignedAnyOrder) {
    return state;
  }

  return {
    ...state,
    pendingOrders: state.pendingOrders.slice(nextPendingIndex),
    bots,
  };
}

export function insertPendingOrder(
  pendingOrders: Order[],
  order: Order,
): Order[] {
  return [...pendingOrders, order].sort(compareOrdersByPriority);
}

function compareOrdersByPriority(left: Order, right: Order): number {
  if (left.type !== right.type) {
    return left.type === 'vip' ? -1 : 1;
  }

  return left.id - right.id;
}
