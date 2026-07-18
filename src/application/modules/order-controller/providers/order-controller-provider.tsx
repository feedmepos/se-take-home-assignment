'use client';

import {
  createContext,
  Dispatch,
  useEffect,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import { BotStatus } from '@/domain';
import { ControllerAction } from '../actions';
import { controllerReducer } from '../reducer';
import { ControllerState, initialState, ORDER_PROCESS_MS } from '../state';

interface IOrderControllerContextValue {
  state: ControllerState;
  dispatch: Dispatch<ControllerAction>;
}

export const OrderControllerContext =
  createContext<IOrderControllerContextValue | null>(null);

interface ActiveTimer {
  orderId: number;
  handle: ReturnType<typeof setTimeout>;
}

/**
 * Owns the state via useReducer and the ONLY side effect in the system
 */
export function OrderControllerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(controllerReducer, initialState);
  const timersRef = useRef<Map<number, ActiveTimer>>(new Map());

  useEffect(() => {
    const timers = timersRef.current;
    const cookingBotIds = new Set<number>();

    for (const bot of state.bots) {
      if (bot.status !== BotStatus.PROCESSING || bot.currentOrderId === null) {
        continue;
      }
      cookingBotIds.add(bot.id);

      const existing = timers.get(bot.id);
      if (existing && existing.orderId === bot.currentOrderId) {
        continue; // already timing this exact order — leave it running
      }
      if (existing) clearTimeout(existing.handle);

      const orderId = bot.currentOrderId;
      const handle = setTimeout(() => {
        timers.delete(bot.id);
        dispatch({ type: 'COMPLETE_ORDER', botId: bot.id, orderId });
      }, ORDER_PROCESS_MS);
      timers.set(bot.id, { orderId, handle });
    }

    // Cancel timers for bots that are no longer cooking (idle or destroyed).
    for (const [botId, timer] of timers) {
      if (!cookingBotIds.has(botId)) {
        clearTimeout(timer.handle);
        timers.delete(botId);
      }
    }
  }, [state.bots]);

  // Clear everything if the provider unmounts.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer.handle));
      timers.clear();
    };
  }, []);

  return (
    <OrderControllerContext.Provider value={{ state, dispatch }}>
      {children}
    </OrderControllerContext.Provider>
  );
}
