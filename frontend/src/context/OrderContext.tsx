import { createContext, useReducer, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { orderReducer, initialState } from "../reducer/orderReducer";
import type { AppState, Action } from "../reducer/types";
import { ORDER_DURATION_MS } from "../constants";

interface OrderContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

type TimerEntry = { handle: ReturnType<typeof setTimeout>; orderId: number };

export const OrderContext = createContext<OrderContextValue | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(orderReducer, initialState);
  const botTimers = useRef<Record<number, TimerEntry>>({});

  useEffect(() => {
    state.bots.forEach((bot) => {
      if (bot.status === "PROCESSING" && bot.processingOrderId) {
        const existing = botTimers.current[bot.id];
        // Already tracking this exact order for this bot — nothing to do
        if (existing?.orderId === bot.processingOrderId) return;
        // Order changed (preemption) or no timer yet — clear stale timer and start fresh
        if (existing) clearTimeout(existing.handle);
        const orderId = bot.processingOrderId;
        botTimers.current[bot.id] = {
          orderId,
          handle: setTimeout(() => {
            dispatch({ type: "ORDER_COMPLETE", botId: bot.id });
            delete botTimers.current[bot.id];
          }, ORDER_DURATION_MS),
        };
      }
    });

    Object.keys(botTimers.current).forEach((key) => {
      const botId = Number(key);
      const bot = state.bots.find((b) => b.id === botId);
      if (!bot || bot.status === "IDLE") {
        clearTimeout(botTimers.current[botId].handle);
        delete botTimers.current[botId];
      }
    });
  }, [state.bots]);

  return (
    <OrderContext.Provider value={{ state, dispatch }}>
      {children}
    </OrderContext.Provider>
  );
}
