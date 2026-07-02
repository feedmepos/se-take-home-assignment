import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  addBot as addBotToState,
  addOrder,
  completeBotOrder,
  createInitialState,
  removeNewestBot,
  type ControllerState,
  type Order,
} from '../domain/orderController';

type Action =
  | { type: 'add-order'; orderType: 'normal' | 'vip' }
  | { type: 'add-bot' }
  | { type: 'remove-newest-bot' }
  | { type: 'complete-order'; botId: number; orderId: number };

type ActiveTimer = {
  orderId: number;
  deadlineAt: number;
  timeoutId: ReturnType<typeof setTimeout>;
};

export type ActivityLogEntry = {
  id: number;
  time: string;
  message: string;
};

const PROCESSING_TIME_MS = 10_000;
const MAX_LOG_ENTRIES = 12;

// ── Reducer ──────────────────────────────────────────────

function reducer(state: ControllerState, action: Action): ControllerState {
  switch (action.type) {
    case 'add-order':
      return addOrder(state, action.orderType);
    case 'add-bot':
      return addBotToState(state);
    case 'remove-newest-bot':
      return removeNewestBot(state);
    case 'complete-order':
      return completeBotOrder(state, action.botId, action.orderId);
    default:
      return state;
  }
}

// ── Activity log helpers ─────────────────────────────────

function formatOrder(order: Order) {
  return `${order.type === 'vip' ? 'VIP' : 'Normal'} Order #${order.id}`;
}

function timestamp() {
  return new Date().toLocaleTimeString('en-GB', { hour12: false });
}

function allOrdersById(state: ControllerState) {
  return new Map(
    [
      ...state.pendingOrders,
      ...state.completedOrders,
      ...state.bots.flatMap((bot) => (bot.order ? [bot.order] : [])),
    ].map((order) => [order.id, order]),
  );
}

function detectNewOrders(prev: ControllerState, curr: ControllerState): string[] {
  const prevOrders = allOrdersById(prev);
  const messages: string[] = [];

  for (const order of allOrdersById(curr).values()) {
    if (!prevOrders.has(order.id)) {
      messages.push(`${formatOrder(order)} created and queued.`);
    }
  }

  return messages;
}

function detectBotChanges(prev: ControllerState, curr: ControllerState): string[] {
  const prevBots = new Map(prev.bots.map((bot) => [bot.id, bot]));
  const currBots = new Map(curr.bots.map((bot) => [bot.id, bot]));
  const messages: string[] = [];

  for (const bot of curr.bots) {
    if (!prevBots.has(bot.id)) {
      messages.push(`Bot #${bot.id} created.`);
    }
  }

  for (const prevBot of prev.bots) {
    if (!currBots.has(prevBot.id)) {
      messages.push(
        prevBot.order
          ? `Bot #${prevBot.id} destroyed while processing ${formatOrder(prevBot.order)}; order returned to PENDING.`
          : `Bot #${prevBot.id} destroyed while IDLE.`,
      );
    }
  }

  return messages;
}

function detectCompletions(prev: ControllerState, curr: ControllerState): string[] {
  const prevCompletedIds = new Set(prev.completedOrders.map((o) => o.id));
  const messages: string[] = [];

  for (const order of curr.completedOrders) {
    if (!prevCompletedIds.has(order.id)) {
      messages.push(`${formatOrder(order)} completed.`);
    }
  }

  return messages;
}

function detectPickups(prev: ControllerState, curr: ControllerState): string[] {
  const prevBots = new Map(prev.bots.map((bot) => [bot.id, bot]));
  const completedOrderIds = new Set(curr.completedOrders.map((o) => o.id));
  const messages: string[] = [];

  for (const bot of curr.bots) {
    if (bot.status !== 'processing' || !bot.order) continue;

    const prevBot = prevBots.get(bot.id);
    const wasProcessingSameOrder =
      prevBot?.status === 'processing' && prevBot.order?.id === bot.order.id;

    if (!wasProcessingSameOrder && !completedOrderIds.has(bot.order.id)) {
      messages.push(`Bot #${bot.id} picked up ${formatOrder(bot.order)}.`);
    }
  }

  return messages;
}

function detectIdleTransition(prev: ControllerState, curr: ControllerState): string[] {
  const prevBots = new Map(prev.bots.map((bot) => [bot.id, bot]));
  const messages: string[] = [];

  for (const bot of curr.bots) {
    const prevBot = prevBots.get(bot.id);
    if (
      prevBot?.status === 'processing' &&
      bot.status === 'idle' &&
      prevBot.order &&
      curr.pendingOrders.length === 0
    ) {
      messages.push(`Bot #${bot.id} is now IDLE; no pending orders.`);
    }
  }

  return messages;
}

function describeStateChange(prev: ControllerState, curr: ControllerState): string[] {
  return [
    ...detectNewOrders(prev, curr),
    ...detectBotChanges(prev, curr),
    ...detectCompletions(prev, curr),
    ...detectPickups(prev, curr),
    ...detectIdleTransition(prev, curr),
  ];
}

// ── Timer management ─────────────────────────────────────

function clearStaleTimers(
  timersRef: React.MutableRefObject<Map<number, ActiveTimer>>,
  bots: ControllerState['bots'],
) {
  const activeBotIds = new Set(bots.map((bot) => bot.id));

  for (const [botId, timer] of timersRef.current) {
    const bot = bots.find((b) => b.id === botId);
    const shouldClear =
      !activeBotIds.has(botId) ||
      !bot ||
      bot.status !== 'processing' ||
      !bot.order ||
      bot.order.id !== timer.orderId;

    if (shouldClear) {
      clearTimeout(timer.timeoutId);
      timersRef.current.delete(botId);
    }
  }
}

function createTimers(
  timersRef: React.MutableRefObject<Map<number, ActiveTimer>>,
  bots: ControllerState['bots'],
  dispatch: React.Dispatch<Action>,
) {
  for (const bot of bots) {
    if (bot.status !== 'processing' || !bot.order) continue;

    const existingTimer = timersRef.current.get(bot.id);
    if (existingTimer?.orderId === bot.order.id) continue;

    if (existingTimer) {
      clearTimeout(existingTimer.timeoutId);
    }

    const orderId = bot.order.id;
    const timeoutId = setTimeout(() => {
      timersRef.current.delete(bot.id);
      dispatch({ type: 'complete-order', botId: bot.id, orderId });
    }, PROCESSING_TIME_MS);

    timersRef.current.set(bot.id, {
      orderId,
      deadlineAt: Date.now() + PROCESSING_TIME_MS,
      timeoutId,
    });
  }
}

// ── Hook ─────────────────────────────────────────────────

export function useOrderController() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const [now, setNow] = useState(() => Date.now());
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const timersRef = useRef<Map<number, ActiveTimer>>(new Map());
  const previousStateRef = useRef<ControllerState | null>(null);
  const nextLogIdRef = useRef(1);

  // Sync timers with bot state
  useEffect(() => {
    clearStaleTimers(timersRef, state.bots);
    createTimers(timersRef, state.bots, dispatch);
  }, [state.bots, state.completedOrders, state.pendingOrders]);

  // Tick every second while any bot is processing
  useEffect(() => {
    if (!state.bots.some((bot) => bot.status === 'processing')) {
      return undefined;
    }

    setNow(Date.now());
    const intervalId = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(intervalId);
  }, [state.bots]);

  // Append activity log entries on state changes
  useEffect(() => {
    const prev = previousStateRef.current;
    previousStateRef.current = state;

    if (!prev) return;

    const messages = describeStateChange(prev, state);
    if (messages.length === 0) return;

    setActivityLog((log) => [
      ...messages.map((message) => ({
        id: nextLogIdRef.current++,
        time: timestamp(),
        message,
      })),
      ...log,
    ].slice(0, MAX_LOG_ENTRIES));
  }, [state]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      for (const timer of timersRef.current.values()) {
        clearTimeout(timer.timeoutId);
      }
      timersRef.current.clear();
    };
  }, []);

  const remainingSecondsByBotId = useMemo(() => {
    const remaining = new Map<number, number>();

    for (const bot of state.bots) {
      if (bot.status !== 'processing') continue;

      const deadlineAt = timersRef.current.get(bot.id)?.deadlineAt;
      const millisecondsLeft = deadlineAt ? Math.max(0, deadlineAt - now) : PROCESSING_TIME_MS;
      remaining.set(bot.id, Math.ceil(millisecondsLeft / 1_000));
    }

    return remaining;
  }, [now, state.bots]);

  const addNormalOrder = useCallback(() => {
    dispatch({ type: 'add-order', orderType: 'normal' });
  }, []);

  const addVipOrder = useCallback(() => {
    dispatch({ type: 'add-order', orderType: 'vip' });
  }, []);

  const addBot = useCallback(() => {
    dispatch({ type: 'add-bot' });
  }, []);

  const removeBot = useCallback(() => {
    dispatch({ type: 'remove-newest-bot' });
  }, []);

  return {
    state,
    processingTimeMs: PROCESSING_TIME_MS,
    remainingSecondsByBotId,
    activityLog,
    addNormalOrder,
    addVipOrder,
    addBot,
    removeBot,
  };
}
