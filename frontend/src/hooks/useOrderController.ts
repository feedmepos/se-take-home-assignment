import { useEffect, useMemo, useReducer, useRef } from "react";

const PROCESS_SECONDS = 10;

type OrderType = "VIP" | "NORMAL";
type BotStatus = "IDLE" | "PROCESSING";

type Order = {
  id: number;
  type: OrderType;
  createdAt: string;
};

type CompletedOrder = Order & {
  completedAt: string;
};

type Bot = {
  id: number;
  status: BotStatus;
  order: Order | null;
  startedAtMs: number | null;
};

type State = {
  nextOrderId: number;
  nextBotId: number;
  pending: Order[];
  complete: CompletedOrder[];
  bots: Bot[];
};

type Action =
  | { type: "ADD_ORDER"; payload: { type: OrderType } }
  | { type: "ADD_BOT" }
  | { type: "REMOVE_BOT" }
  | { type: "FINISH_ORDER"; payload: { botId: number; orderId: number } };

type Stats = {
  totalBots: number;
  processing: number;
  idle: number;
  pending: number;
  vipPending: number;
  complete: number;
};

type UseOrderControllerResult = {
  state: State;
  stats: Stats;
  addNormalOrder: () => void;
  addVipOrder: () => void;
  addBot: () => void;
  removeBot: () => void;
};

function timestampNow(): string {
  return new Date().toTimeString().slice(0, 8);
}

function insertPendingByPriority(pending: Order[], order: Order): Order[] {
  if (order.type === "VIP") {
    const lastVipIndex = pending.map(item => item.type).lastIndexOf("VIP");
    if (lastVipIndex === -1) {
      return [order, ...pending];
    }
    return [
      ...pending.slice(0, lastVipIndex + 1),
      order,
      ...pending.slice(lastVipIndex + 1),
    ];
  }

  return [...pending, order];
}

function assignOrders(state: State): State {
  if (!state.pending.length || !state.bots.length) {
    return state;
  }

  const pending = [...state.pending];
  const bots = state.bots.map(bot => {
    if (bot.status === "IDLE" && pending.length > 0) {
      const nextOrder = pending.shift();
      if (!nextOrder) {
        return bot;
      }

      return {
        ...bot,
        status: "PROCESSING",
        order: nextOrder,
        startedAtMs: Date.now(),
      };
    }
    return bot;
  });

  return {
    ...state,
    pending,
    bots,
  };
}

const initialState: State = {
  nextOrderId: 1,
  nextBotId: 1,
  pending: [],
  complete: [],
  bots: [],
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD_ORDER": {
      const order: Order = {
        id: state.nextOrderId,
        type: action.payload.type,
        createdAt: timestampNow(),
      };

      const pending = insertPendingByPriority(state.pending, order);

      return assignOrders({
        ...state,
        nextOrderId: state.nextOrderId + 1,
        pending,
      });
    }

    case "ADD_BOT": {
      const newBot = {
        id: state.nextBotId,
        status: "IDLE",
        order: null,
        startedAtMs: null,
      };

      return assignOrders({
        ...state,
        nextBotId: state.nextBotId + 1,
        bots: [...state.bots, newBot],
      });
    }

    case "REMOVE_BOT": {
      if (state.bots.length === 0) {
        return state;
      }

      const bots = [...state.bots];
      const removed = bots.pop();

      let pending = [...state.pending];
      if (removed?.order) {
        pending = insertPendingByPriority(pending, removed.order);
      }

      return assignOrders({
        ...state,
        bots,
        pending,
      });
    }

    case "FINISH_ORDER": {
      const bots = state.bots.map(bot => {
        if (
          bot.id !== action.payload.botId ||
          !bot.order ||
          bot.order.id !== action.payload.orderId
        ) {
          return bot;
        }

        return {
          ...bot,
          status: "IDLE",
          order: null,
          startedAtMs: null,
        };
      });

      const completedOrder = state.bots.find(
        bot => bot.id === action.payload.botId,
      )?.order;

      if (!completedOrder || completedOrder.id !== action.payload.orderId) {
        return state;
      }

      const complete: CompletedOrder[] = [
        {
          ...completedOrder,
          completedAt: timestampNow(),
        },
        ...state.complete,
      ];

      return assignOrders({
        ...state,
        bots,
        complete,
      });
    }

    default:
      return state;
  }
}

export function useOrderController(): UseOrderControllerResult {
  const [state, dispatch] = useReducer(reducer, initialState);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  useEffect(() => {
    const processingBots = state.bots.filter(
      bot => bot.status === "PROCESSING",
    );

    for (const bot of processingBots) {
      if (
        !bot.order ||
        bot.startedAtMs === null ||
        timersRef.current.has(bot.id)
      ) {
        continue;
      }

      const elapsed = Date.now() - bot.startedAtMs;
      const remaining = Math.max(0, PROCESS_SECONDS * 1000 - elapsed);
      const orderId = bot.order.id;

      const timerId = setTimeout(() => {
        dispatch({
          type: "FINISH_ORDER",
          payload: { botId: bot.id, orderId },
        });
        timersRef.current.delete(bot.id);
      }, remaining);

      timersRef.current.set(bot.id, timerId);
    }

    // clear timers for bots that are removed
    for (const [botId, timerId] of timersRef.current.entries()) {
      const stillProcessing = processingBots.some(bot => bot.id === botId);
      if (!stillProcessing) {
        clearTimeout(timerId);
        timersRef.current.delete(botId);
      }
    }

    return () => {
      for (const timerId of timersRef.current.values()) {
        clearTimeout(timerId);
      }
      timersRef.current.clear();
    };
  }, [state.bots]);

  const stats = useMemo(() => {
    const processing = state.bots.filter(
      bot => bot.status === "PROCESSING",
    ).length;
    const idle = state.bots.length - processing;
    const vipPending = state.pending.filter(
      order => order.type === "VIP",
    ).length;

    return {
      totalBots: state.bots.length,
      processing,
      idle,
      pending: state.pending.length,
      vipPending,
      complete: state.complete.length,
    };
  }, [state]);

  return {
    state,
    stats,
    addNormalOrder: () =>
      dispatch({ type: "ADD_ORDER", payload: { type: "NORMAL" } }),
    addVipOrder: () =>
      dispatch({ type: "ADD_ORDER", payload: { type: "VIP" } }),
    addBot: () => dispatch({ type: "ADD_BOT" }),
    removeBot: () => dispatch({ type: "REMOVE_BOT" }),
  };
}
