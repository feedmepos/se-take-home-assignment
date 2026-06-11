'use client';

import { useReducer, useEffect, useMemo, useCallback } from 'react';
import type { Order, Bot, KitchenState, KitchenAction, KitchenStateReturn } from '@/types';
import { PROCESSING_TIME_MS, TICK_INTERVAL_MS, ORDER_NUMBER_WRAP, ORDER_NUMBER_PADDING } from '@/constants';

// ---- Helpers ----

function generateOrderNumber(counter: number): number {
  return ((counter - 1) % ORDER_NUMBER_WRAP) + 1;
}

function formatOrderNumber(num: number): string {
  return num.toString().padStart(ORDER_NUMBER_PADDING, '0');
}

function getHighestPriorityPending(orders: Order[]): Order | undefined {
  const pending = orders.filter((o) => o.status === 'PENDING');
  if (pending.length === 0) return undefined;
  pending.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'VIP' ? -1 : 1;
    return a.createdAt - b.createdAt;
  });
  return pending[0];
}

function createOrder(counter: number, type: 'VIP' | 'NORMAL'): Order {
  return {
    id: crypto.randomUUID(),
    orderNumber: generateOrderNumber(counter),
    type,
    status: 'PENDING',
    createdAt: Date.now(),
    processingStartedAt: null,
    processingBotId: null,
    completedAt: null,
  };
}

// ---- Initial State ----

const initialState: KitchenState = {
  orders: [],
  bots: [],
  orderIdCounter: 0,
  botIdCounter: 0,
  tickCounter: 0,
};

// ---- Reducer ----

function kitchenReducer(state: KitchenState, action: KitchenAction): KitchenState {
  switch (action.type) {

    case 'ADD_NORMAL_ORDER':
    case 'ADD_VIP_ORDER': {
      const newCounter = state.orderIdCounter + 1;
      const order = createOrder(newCounter, action.type === 'ADD_VIP_ORDER' ? 'VIP' : 'NORMAL');
      return { ...state, orders: [...state.orders, order], orderIdCounter: newCounter };
    }

    case 'ADD_BOT': {
      const newBotId = state.botIdCounter + 1;
      const bot: Bot = { id: newBotId, status: 'IDLE', currentOrderId: null };
      const newState: KitchenState = {
        ...state,
        bots: [...state.bots, bot],
        botIdCounter: newBotId,
      };
      // Pick up an order immediately
      return assignBotToOrder(newState, bot, Date.now());
    }

    case 'REMOVE_BOT': {
      if (state.bots.length === 0) return state;
      const botIndex = state.bots.reduce(
        (maxIdx, bot, idx) => (bot.id > state.bots[maxIdx].id ? idx : maxIdx), 0
      );
      const removedBot = state.bots[botIndex];
      let orders = state.orders;
      if (removedBot.currentOrderId) {
        orders = orders.map((o) =>
          o.id === removedBot.currentOrderId
            ? { ...o, status: 'PENDING' as const, processingStartedAt: null, processingBotId: null }
            : o
        );
      }
      return {
        ...state,
        orders,
        bots: state.bots.filter((_, i) => i !== botIndex),
      };
    }

    case 'TICK': {
      const now = action.now;
      let orders = state.orders;
      let bots = state.bots;

      // 1. Complete finished orders and free their bots
      orders = orders.map((o) => {
        if (o.status === 'PROCESSING' && o.processingStartedAt !== null && now - o.processingStartedAt >= PROCESSING_TIME_MS) {
          return { ...o, status: 'COMPLETE' as const, processingStartedAt: null, processingBotId: null, completedAt: now };
        }
        return o;
      });
      bots = bots.map((b) => {
        if (b.status === 'PROCESSING' && b.currentOrderId) {
          const order = orders.find((o) => o.id === b.currentOrderId);
          if (!order || order.status !== 'PROCESSING') {
            return { ...b, status: 'IDLE' as const, currentOrderId: null };
          }
        }
        return b;
      });

      // 2. Assign idle bots to pending orders (reuses assignNextPendingToBot)
      for (const bot of bots) {
        if (bot.status !== 'IDLE') continue;
        const result = assignNextPendingToBot(orders, bots, bot.id, now);
        if (result.orders === orders) break;
        orders = result.orders;
        bots = result.bots;
      }

      return {
        orders,
        bots,
        orderIdCounter: state.orderIdCounter,
        botIdCounter: state.botIdCounter,
        tickCounter: state.tickCounter + 1,
      };
    }

    default:
      return state;
  }
}

// ---- Bot-to-order assignment (shared by ADD_BOT) ----

function assignNextPendingToBot(orders: Order[], bots: Bot[], botId: number, now: number): { orders: Order[]; bots: Bot[] } {
  const next = getHighestPriorityPending(orders);
  if (!next) return { orders, bots };
  return {
    orders: orders.map((o) =>
      o.id === next.id
        ? { ...o, status: 'PROCESSING' as const, processingStartedAt: now, processingBotId: botId }
        : o
    ),
    bots: bots.map((b) =>
      b.id === botId
        ? { ...b, status: 'PROCESSING' as const, currentOrderId: next.id }
        : b
    ),
  };
}

// ---- Bot-to-order assignment (used by ADD_BOT and TICK) ----

function assignBotToOrder(state: KitchenState, bot: Bot, now: number): KitchenState {
  const result = assignNextPendingToBot(state.orders, state.bots, bot.id, now);
  return { ...state, orders: result.orders, bots: result.bots };
}

// ---- Hook ----

export function useKitchenState(): KitchenStateReturn {
  const [state, dispatch] = useReducer(kitchenReducer, initialState);

  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'TICK', now: Date.now() }), TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const pendingOrders = useMemo(
    () => state.orders.filter((o) => o.status === 'PENDING').sort((a, b) => {
      if (a.type !== b.type) return a.type === 'VIP' ? -1 : 1;
      return a.createdAt - b.createdAt;
    }),
    [state.orders]
  );

  const processingOrders = useMemo(
    () => state.orders.filter((o) => o.status === 'PROCESSING'),
    [state.orders]
  );

  const completedOrders = useMemo(
    () => state.orders.filter((o) => o.status === 'COMPLETE').sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0)),
    [state.orders]
  );

  const addNormalOrder = useCallback(() => dispatch({ type: 'ADD_NORMAL_ORDER' }), []);
  const addVipOrder = useCallback(() => dispatch({ type: 'ADD_VIP_ORDER' }), []);
  const addBot = useCallback(() => dispatch({ type: 'ADD_BOT' }), []);
  const removeBot = useCallback(() => dispatch({ type: 'REMOVE_BOT' }), []);

  return { state, pendingOrders, processingOrders, completedOrders, addNormalOrder, addVipOrder, addBot, removeBot };
}

export { formatOrderNumber };
