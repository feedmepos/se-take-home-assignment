import type { Bot, Order, OrderType, SystemState } from './types';

/** Each order takes 10 seconds to cook (README requirement 4). */
export const DEFAULT_PROCESS_MS = 10_000;

/**
 * The whole order controller is modelled as pure functions over an immutable
 * `SystemState`. Nothing here touches React, timers, or the DOM — `now` is
 * always passed in — which keeps the rules trivially unit-testable.
 */

export function createInitialState(): SystemState {
  return { orders: [], bots: [], nextOrderId: 1, nextBotId: 1 };
}

/** Add a new PENDING order. Order numbers are unique and increasing (req 3). */
export function addOrder(state: SystemState, type: OrderType, now: number): SystemState {
  const order: Order = {
    id: state.nextOrderId,
    type,
    status: 'PENDING',
    createdAt: now,
  };
  return {
    ...state,
    orders: [...state.orders, order],
    nextOrderId: state.nextOrderId + 1,
  };
}

/** Add a new IDLE bot (req 3). */
export function addBot(state: SystemState): SystemState {
  const bot: Bot = { id: state.nextBotId, orderId: null };
  return {
    ...state,
    bots: [...state.bots, bot],
    nextBotId: state.nextBotId + 1,
  };
}

/**
 * Destroy the newest bot (req 6). If it was cooking, that order is returned to
 * PENDING. Because the order keeps its original id, re-sorting the queue puts
 * it back in its original priority position automatically.
 */
export function removeBot(state: SystemState): SystemState {
  if (state.bots.length === 0) return state;

  const removed = state.bots[state.bots.length - 1];
  const bots = state.bots.slice(0, -1);

  let orders = state.orders;
  if (removed.orderId !== null) {
    orders = orders.map((o) =>
      o.id === removed.orderId
        ? { ...o, status: 'PENDING', startedAt: undefined, botId: undefined }
        : o,
    );
  }

  return { ...state, bots, orders };
}

const RANK: Record<OrderType, number> = { VIP: 0, NORMAL: 1 };

/**
 * Priority order for the PENDING queue: all VIPs first, then all NORMALs, each
 * group oldest-first. Since ids are increasing, this single key satisfies both
 * "VIP jumps ahead of normals but behind earlier VIPs" (req 2) and "a returned
 * order goes back to its original position" (req 6).
 */
function byPriority(a: Order, b: Order): number {
  return RANK[a.type] - RANK[b.type] || a.id - b.id;
}

export function pendingOrders(state: SystemState): Order[] {
  return state.orders.filter((o) => o.status === 'PENDING').sort(byPriority);
}

export function completeOrders(state: SystemState): Order[] {
  return state.orders
    .filter((o) => o.status === 'COMPLETE')
    .sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0) || a.id - b.id);
}

export interface BotView {
  id: number;
  order: Order | null;
}

/** Bots paired with the order they are currently cooking (for rendering). */
export function botsView(state: SystemState): BotView[] {
  return state.bots.map((b) => ({
    id: b.id,
    order: b.orderId === null ? null : state.orders.find((o) => o.id === b.orderId) ?? null,
  }));
}

/**
 * Advance the system to time `now`:
 *   1. complete any order that has cooked for >= processMs and free its bot;
 *   2. assign every idle bot the next pending order by priority.
 * Returns the same reference when nothing changed so React can skip re-renders
 * on idle ticks.
 */
export function reconcile(
  state: SystemState,
  now: number,
  processMs: number = DEFAULT_PROCESS_MS,
): SystemState {
  let changed = false;
  let orders = state.orders;

  // 1) Complete finished orders.
  orders = orders.map((o) => {
    if (o.status === 'PROCESSING' && o.startedAt !== undefined && now - o.startedAt >= processMs) {
      changed = true;
      return { ...o, status: 'COMPLETE', completedAt: o.startedAt + processMs, botId: undefined };
    }
    return o;
  });

  // Free any bot whose order is no longer processing.
  let bots = state.bots.map((b) => {
    if (b.orderId !== null) {
      const order = orders.find((o) => o.id === b.orderId);
      if (!order || order.status !== 'PROCESSING') {
        changed = true;
        return { ...b, orderId: null };
      }
    }
    return b;
  });

  // 2) Assign idle bots to the highest-priority pending orders.
  const queue = orders.filter((o) => o.status === 'PENDING').sort(byPriority);
  let next = 0;
  bots = bots.map((b) => {
    if (b.orderId === null && next < queue.length) {
      const order = queue[next++];
      changed = true;
      orders = orders.map((o) =>
        o.id === order.id ? { ...o, status: 'PROCESSING', startedAt: now, botId: b.id } : o,
      );
      return { ...b, orderId: order.id };
    }
    return b;
  });

  if (!changed) return state;
  return { ...state, orders, bots };
}
