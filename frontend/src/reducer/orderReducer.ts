import type { AppState, Action, Order, Bot } from "./types";
import {
  insertAt,
  updateWhere,
  removeWhere,
  findOrder,
  findFirstPending,
  findIdleBots,
  findBotForOrder,
  markProcessing,
  markPending,
  markComplete,
  assignBot,
  idleBot,
  createdLatest,
} from "./helpers";

export const initialState: AppState = {
  orders: [],
  bots: [],
  nextOrderId: 1,
  nextBotId: 1,
};

// ── Queue insertion ──

function insertVipOrder(orders: Order[], newOrder: Order): Order[] {
  let lastVipIndex = -1;
  for (let i = 0; i < orders.length; i++) {
    if (orders[i].type === "VIP" && orders[i].status === "PENDING")
      lastVipIndex = i;
  }
  if (lastVipIndex >= 0) return insertAt(orders, lastVipIndex + 1, newOrder);

  const firstNormalIndex = orders.findIndex(
    (o) => o.type === "NORMAL" && o.status === "PENDING",
  );
  if (firstNormalIndex >= 0) return insertAt(orders, firstNormalIndex, newOrder);

  return [...orders, newOrder];
}

function reinsertOrder(orders: Order[], order: Order): Order[] {
  const reset = markPending(order);
  const sameType = reset.type;

  for (let i = 0; i < orders.length; i++) {
    if (
      orders[i].type === sameType &&
      orders[i].status === "PENDING" &&
      orders[i].createdAt > reset.createdAt
    ) {
      return insertAt(orders, i, reset);
    }
  }

  if (sameType === "VIP") {
    const firstNormalIndex = orders.findIndex(
      (o) => o.type === "NORMAL" && o.status === "PENDING",
    );
    if (firstNormalIndex >= 0) return insertAt(orders, firstNormalIndex, reset);
  }

  return [...orders, reset];
}

// ── Bot assignment ──

function assignIdleBot(
  orders: Order[],
  bots: Bot[],
): { orders: Order[]; bots: Bot[] } {
  const idle = findIdleBots(bots)[0];
  const pending = findFirstPending(orders);
  if (!idle || !pending) return { orders, bots };

  return {
    orders: updateWhere(orders, (o) => o.id === pending.id, markProcessing),
    bots: updateWhere(bots, (b) => b.id === idle.id, (b) => assignBot(b, pending.id)),
  };
}

// ── Bot removal selection ──

function selectBotToRemove(_orders: Order[], bots: Bot[]): Bot {
  return bots.reduce((newest, bot) =>
    bot.createdAt > newest.createdAt ? bot : newest,
  );
}

// ── VIP preemption ──

function applyVipPreemption(
  orders: Order[],
  bots: Bot[],
): { orders: Order[]; bots: Bot[] } {
  const pendingVip = orders.find(
    (o) => o.type === "VIP" && o.status === "PENDING",
  );
  if (!pendingVip) return { orders, bots };

  if (bots.some((b) => b.status === "IDLE")) {
    return assignIdleBot(orders, bots);
  }

  const processingNormals = orders.filter(
    (o) => o.type === "NORMAL" && o.status === "PROCESSING",
  );
  if (processingNormals.length === 0) return { orders, bots };

  const latestNormal = processingNormals.reduce(createdLatest);
  const botToPreempt = findBotForOrder(bots, latestNormal.id);
  if (!botToPreempt) return { orders, bots };

  const restored = reinsertOrder(
    removeWhere(orders, (o) => o.id === latestNormal.id),
    latestNormal,
  );
  const freed = updateWhere(bots, (b) => b.id === botToPreempt.id, idleBot);

  return assignIdleBot(restored, freed);
}

// ── Reducer ──

function createOrder(state: AppState, type: "NORMAL" | "VIP"): Order {
  return {
    id: state.nextOrderId,
    type,
    status: "PENDING",
    createdAt: Date.now(),
  };
}

export function orderReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "ADD_NORMAL_ORDER": {
      const order = createOrder(state, "NORMAL");
      const { orders, bots } = assignIdleBot(
        [...state.orders, order],
        state.bots,
      );
      return { ...state, orders, bots, nextOrderId: state.nextOrderId + 1 };
    }

    case "ADD_VIP_ORDER": {
      const order = createOrder(state, "VIP");
      const { orders, bots } = applyVipPreemption(
        insertVipOrder(state.orders, order),
        state.bots,
      );
      return { ...state, orders, bots, nextOrderId: state.nextOrderId + 1 };
    }

    case "ADD_BOT": {
      const newBot: Bot = {
        id: state.nextBotId,
        status: "IDLE",
        processingOrderId: undefined,
        createdAt: Date.now(),
      };
      const { orders, bots } = assignIdleBot(state.orders, [
        ...state.bots,
        newBot,
      ]);
      return { ...state, orders, bots, nextBotId: state.nextBotId + 1 };
    }

    case "REMOVE_BOT": {
      if (state.bots.length === 0) return state;

      const victim = selectBotToRemove(state.orders, state.bots);
      let orders = state.orders;

      if (victim.processingOrderId) {
        const order = findOrder(state.orders, victim.processingOrderId);
        if (order) {
          orders = reinsertOrder(
            removeWhere(state.orders, (o) => o.id === order.id),
            order,
          );
        }
      }

      const remainingBots = removeWhere(state.bots, (b) => b.id === victim.id);
      const { orders: final, bots: finalBots } = applyVipPreemption(
        orders,
        remainingBots,
      );
      return { ...state, orders: final, bots: finalBots };
    }

    case "ORDER_COMPLETE": {
      const bot = state.bots.find((b) => b.id === action.botId);
      if (!bot || !bot.processingOrderId) return state;

      const completed = updateWhere(
        state.orders,
        (o) => o.id === bot.processingOrderId,
        markComplete,
      );

      const next = findFirstPending(completed);
      if (next) {
        return {
          ...state,
          orders: updateWhere(completed, (o) => o.id === next.id, markProcessing),
          bots: updateWhere(state.bots, (b) => b.id === action.botId, (b) => assignBot(b, next.id)),
        };
      }

      return {
        ...state,
        orders: completed,
        bots: updateWhere(state.bots, (b) => b.id === action.botId, idleBot),
      };
    }

    default:
      return state;
  }
}
