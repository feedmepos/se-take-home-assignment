'use client';

import { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import type { Dispatch, ReactNode } from 'react';

import type { Action } from '../store/actions';
import { initialState, reducer } from '../store/reducer';
import { getIdleBots, getPendingOrders } from '../store/selectors';
import type { AppState, Bot } from '../types';

interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<Action>;
  removeNewestBot: () => void;
}

export const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const timerRefs = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const idleBots = getIdleBots(state);
    const pendingOrders = getPendingOrders(state);

    idleBots.forEach((bot, index) => {
      const order = pendingOrders[index];

      if (!order) {
        return;
      }

      if (timerRefs.current[bot.id] !== undefined) {
        clearTimeout(timerRefs.current[bot.id]);
        delete timerRefs.current[bot.id];
      }

      dispatch({
        type: 'ASSIGN_ORDER',
        payload: { botId: bot.id, orderId: order.id },
      });

      const timerId = setTimeout(() => {
        const latestState = stateRef.current;
        const latestBot = latestState.bots.find((candidate) => candidate.id === bot.id);
        const latestOrder = latestState.orders.find((candidate) => candidate.id === order.id);

        if (
          !latestBot ||
          latestBot.status !== 'processing' ||
          latestBot.currentOrderId !== order.id ||
          latestOrder?.status !== 'processing'
        ) {
          if (timerRefs.current[bot.id] === timerId) {
            delete timerRefs.current[bot.id];
          }

          return;
        }

        if (timerRefs.current[bot.id] === timerId) {
          delete timerRefs.current[bot.id];
        }

        dispatch({
          type: 'COMPLETE_ORDER',
          payload: { botId: bot.id, orderId: order.id },
        });
      }, 10_000);

      timerRefs.current[bot.id] = timerId;
    });
  }, [state]);

  useEffect(() => {
    return () => {
      Object.values(timerRefs.current).forEach((timerId) => clearTimeout(timerId));
      timerRefs.current = {};
    };
  }, []);

  function removeNewestBot() {
    const newestBot = state.bots.reduce<Bot | null>(
      (currentNewest, bot) => {
        if (currentNewest === null || bot.id > currentNewest.id) {
          return bot;
        }

        return currentNewest;
      },
      null,
    );

    if (!newestBot) {
      return;
    }

    const timerId = timerRefs.current[newestBot.id];

    if (timerId !== undefined) {
      clearTimeout(timerId);
      delete timerRefs.current[newestBot.id];
    }

    dispatch({ type: 'REMOVE_BOT' });
  }

  return (
    <AppContext.Provider value={{ state, dispatch, removeNewestBot }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider.');
  }

  return context;
}
