import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  addBot,
  addOrder,
  completeOrder,
  createInitialState,
  getRemainingMs,
  removeBot,
} from '../domain/orderController';
import type { AppState } from '../domain/types';
import { PROCESSING_TIME_MS } from '../domain/types';

type Action =
  | { type: 'NEW_NORMAL_ORDER' }
  | { type: 'NEW_VIP_ORDER' }
  | { type: 'ADD_BOT' }
  | { type: 'REMOVE_BOT' }
  | { type: 'ORDER_COMPLETE'; botId: number; orderId: number };

function reducer(state: AppState, action: Action): AppState {
  const now = new Date();

  switch (action.type) {
    case 'NEW_NORMAL_ORDER':
      return addOrder(state, 'NORMAL', now);
    case 'NEW_VIP_ORDER':
      return addOrder(state, 'VIP', now);
    case 'ADD_BOT':
      return addBot(state, now);
    case 'REMOVE_BOT':
      return removeBot(state, now);
    case 'ORDER_COMPLETE':
      return completeOrder(state, action.botId, action.orderId, now);
    default:
      return state;
  }
}

export function useOrderSystem() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const [now, setNow] = useState(() => Date.now());
  const timersRef = useRef<Map<number, number>>(new Map());

  const clearBotTimer = useCallback((botId: number) => {
    const timerId = timersRef.current.get(botId);
    if (timerId !== undefined) {
      window.clearTimeout(timerId);
      timersRef.current.delete(botId);
    }
  }, []);

  const scheduleCompletion = useCallback(
    (botId: number, orderId: number, startedAt: number) => {
      clearBotTimer(botId);
      const elapsed = Date.now() - startedAt;
      const delay = Math.max(0, PROCESSING_TIME_MS - elapsed);

      const timerId = window.setTimeout(() => {
        dispatch({ type: 'ORDER_COMPLETE', botId, orderId });
        timersRef.current.delete(botId);
      }, delay);

      timersRef.current.set(botId, timerId);
    },
    [clearBotTimer],
  );

  useEffect(() => {
    for (const bot of state.bots) {
      if (
        bot.status === 'PROCESSING' &&
        bot.currentOrder &&
        bot.processingStartedAt &&
        !timersRef.current.has(bot.id)
      ) {
        scheduleCompletion(bot.id, bot.currentOrder.id, bot.processingStartedAt);
      }
    }
  }, [state.bots, scheduleCompletion]);

  useEffect(() => {
    const activeBotIds = new Set(
      state.bots
        .filter((bot) => bot.status === 'PROCESSING' && bot.currentOrder)
        .map((bot) => bot.id),
    );

    for (const botId of timersRef.current.keys()) {
      if (!activeBotIds.has(botId)) {
        clearBotTimer(botId);
      }
    }
  }, [state.bots, clearBotTimer]);

  useEffect(() => {
    const hasProcessingBots = state.bots.some(
      (bot) => bot.status === 'PROCESSING' && bot.currentOrder,
    );

    if (!hasProcessingBots) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 100);

    return () => window.clearInterval(intervalId);
  }, [state.bots]);

  useEffect(() => {
    return () => {
      for (const timerId of timersRef.current.values()) {
        window.clearTimeout(timerId);
      }
      timersRef.current.clear();
    };
  }, []);

  const botProgress = useMemo(
    () =>
      state.bots.map((bot) => {
        const remainingMs = getRemainingMs(bot, now);

        return {
          botId: bot.id,
          remainingMs,
          progress:
            bot.status === 'PROCESSING' && bot.currentOrder
              ? 1 - remainingMs / PROCESSING_TIME_MS
              : 0,
        };
      }),
    [state.bots, now],
  );

  const newNormalOrder = useCallback(() => dispatch({ type: 'NEW_NORMAL_ORDER' }), []);
  const newVipOrder = useCallback(() => dispatch({ type: 'NEW_VIP_ORDER' }), []);
  const addBotAction = useCallback(() => dispatch({ type: 'ADD_BOT' }), []);
  const removeBotAction = useCallback(() => dispatch({ type: 'REMOVE_BOT' }), []);

  const actions = useMemo(
    () => ({
      newNormalOrder,
      newVipOrder,
      addBot: addBotAction,
      removeBot: removeBotAction,
    }),
    [newNormalOrder, newVipOrder, addBotAction, removeBotAction],
  );

  return {
    state,
    botProgress,
    actions,
  };
}
