import {
  dequeueNextOrder,
  enqueueOrder,
  hasPendingOrders,
  restoreOrderToQueue,
} from './queue';
import type { AppState, Bot, LogEntry, Order, OrderType } from './types';
import { INITIAL_ORDER_ID, PROCESSING_TIME_MS } from './types';

export function createInitialState(): AppState {
  return {
    nextOrderId: INITIAL_ORDER_ID,
    nextBotId: 1,
    vipQueue: [],
    normalQueue: [],
    bots: [],
    completedOrders: [],
    eventLog: [],
  };
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour12: false });
}

function appendLog(state: AppState, message: string, now = new Date()): AppState {
  const entry: LogEntry = { time: formatTime(now), message };
  return { ...state, eventLog: [...state.eventLog, entry] };
}

function orderLabel(order: Order): string {
  return `${order.type === 'VIP' ? 'VIP' : 'Normal'} Order #${order.id}`;
}

function findBot(state: AppState, botId: number): Bot | undefined {
  return state.bots.find((bot) => bot.id === botId);
}

function assignOrderToBot(
  state: AppState,
  botId: number,
  now = new Date(),
): AppState {
  const bot = findBot(state, botId);
  if (!bot || bot.status === 'PROCESSING' || !hasPendingOrders(state)) {
    return state;
  }

  const { state: nextState, order, savedPosition } = dequeueNextOrder(state);
  if (!order || !savedPosition) {
    return state;
  }

  const processingOrder: Order = {
    ...order,
    status: 'PROCESSING',
    savedQueuePosition: savedPosition,
  };

  let updated = {
    ...nextState,
    bots: nextState.bots.map((item) =>
      item.id === botId
        ? {
            ...item,
            status: 'PROCESSING' as const,
            currentOrder: processingOrder,
            processingStartedAt: now.getTime(),
          }
        : item,
    ),
  };

  updated = appendLog(
    updated,
    `Bot #${botId} picked up ${orderLabel(processingOrder)} - Status: PROCESSING`,
    now,
  );

  return updated;
}

function assignIdleBots(state: AppState, now = new Date()): AppState {
  let next = state;

  for (const bot of next.bots) {
    if (bot.status === 'IDLE' && hasPendingOrders(next)) {
      next = assignOrderToBot(next, bot.id, now);
    }
  }

  return next;
}

export function addOrder(state: AppState, type: OrderType, now = new Date()): AppState {
  const id = state.nextOrderId;
  let next = enqueueOrder(
    { ...state, nextOrderId: state.nextOrderId + 1 },
    type,
    id,
  );

  next = appendLog(
    next,
    `Created ${type === 'VIP' ? 'VIP' : 'Normal'} Order #${id} - Status: PENDING`,
    now,
  );

  return assignIdleBots(next, now);
}

export function addBot(state: AppState, now = new Date()): AppState {
  const botId = state.nextBotId;
  const bot: Bot = {
    id: botId,
    status: 'IDLE',
    currentOrder: null,
    processingStartedAt: null,
  };

  let next = appendLog(
    { ...state, nextBotId: state.nextBotId + 1, bots: [...state.bots, bot] },
    `Bot #${botId} created - Status: ACTIVE`,
    now,
  );

  if (hasPendingOrders(next)) {
    next = assignOrderToBot(next, botId, now);
  } else {
    next = appendLog(next, `Bot #${botId} is now IDLE - No pending orders`, now);
  }

  return next;
}

export function completeOrder(
  state: AppState,
  botId: number,
  orderId: number,
  now = new Date(),
): AppState {
  const bot = findBot(state, botId);
  if (!bot?.currentOrder || bot.currentOrder.id !== orderId) {
    return state;
  }

  const completed: Order = { ...bot.currentOrder, status: 'COMPLETE' };
  const startedAt = bot.processingStartedAt ?? now.getTime();
  const durationSec = Math.round((now.getTime() - startedAt) / 1000);

  let next: AppState = {
    ...state,
    completedOrders: [...state.completedOrders, completed],
    bots: state.bots.map((item) =>
      item.id === botId
        ? {
            ...item,
            status: 'IDLE',
            currentOrder: null,
            processingStartedAt: null,
          }
        : item,
    ),
  };

  next = appendLog(
    next,
    `Bot #${botId} completed ${orderLabel(completed)} - Status: COMPLETE (Processing time: ${durationSec}s)`,
    now,
  );

  if (hasPendingOrders(next)) {
    return assignOrderToBot(next, botId, now);
  }

  return appendLog(next, `Bot #${botId} is now IDLE - No pending orders`, now);
}

export function removeBot(state: AppState, now = new Date()): AppState {
  if (state.bots.length === 0) {
    return state;
  }

  const newestBot = state.bots.reduce((latest, bot) =>
    bot.id > latest.id ? bot : latest,
  );

  let next = state;

  if (newestBot.status === 'PROCESSING' && newestBot.currentOrder) {
    const restoredOrder = newestBot.currentOrder;
    next = restoreOrderToQueue(next, restoredOrder);
    next = appendLog(
      next,
      `Bot #${newestBot.id} destroyed while processing - ${orderLabel(restoredOrder)} returned to PENDING`,
      now,
    );
  } else {
    next = appendLog(next, `Bot #${newestBot.id} destroyed while IDLE`, now);
  }

  next = {
    ...next,
    bots: next.bots.filter((bot) => bot.id !== newestBot.id),
  };

  return next;
}

export function getRemainingMs(bot: Bot, now = Date.now()): number {
  if (!bot.processingStartedAt || !bot.currentOrder) {
    return PROCESSING_TIME_MS;
  }

  const elapsed = now - bot.processingStartedAt;
  return Math.max(0, PROCESSING_TIME_MS - elapsed);
}
