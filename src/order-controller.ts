export const PROCESSING_MS = 10_000;
const MAX_EVENTS = 10;

export type OrderKind = "normal" | "vip";

export type Order = {
  id: number;
  kind: OrderKind;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
};

export type IdleBot = {
  id: number;
  status: "idle";
};

export type ProcessingBot = {
  id: number;
  status: "processing";
  order: Order;
  startedAt: number;
  finishAt: number;
};

export type Bot = IdleBot | ProcessingBot;

export type State = {
  nextOrderId: number;
  nextBotId: number;
  now: number;
  pending: Order[];
  completed: Order[];
  bots: Bot[];
  events: string[];
};

export type Action =
  | { type: "add-order"; kind: OrderKind; now: number }
  | { type: "add-bot"; now: number }
  | { type: "remove-bot"; now: number }
  | { type: "complete-order"; botId: number; now: number };

export function createInitialState(now = Date.now()): State {
  return {
    nextOrderId: 1,
    nextBotId: 1,
    now,
    pending: [],
    completed: [],
    bots: [],
    events: [],
  };
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "add-order": {
      const order: Order = {
        id: state.nextOrderId,
        kind: action.kind,
        createdAt: action.now,
      };

      return schedulePending({
        ...state,
        now: action.now,
        nextOrderId: state.nextOrderId + 1,
        pending: insertPending(state.pending, order),
        events: addEvent(state.events, `${orderLabel(order)} entered pending.`, action.now),
      });
    }

    case "add-bot": {
      const bot: Bot = { id: state.nextBotId, status: "idle" };

      return schedulePending({
        ...state,
        now: action.now,
        nextBotId: state.nextBotId + 1,
        bots: [...state.bots, bot],
        events: addEvent(state.events, `Bot #${bot.id} came online.`, action.now),
      });
    }

    case "remove-bot": {
      const newestBot = state.bots.at(-1);

      if (!newestBot) {
        return { ...state, now: action.now };
      }

      let pending = state.pending;
      let events = state.events;
      const bots = state.bots.slice(0, -1);

      if (newestBot.status === "processing") {
        pending = insertPending(pending, {
          id: newestBot.order.id,
          kind: newestBot.order.kind,
          createdAt: newestBot.order.createdAt,
        });
        events = addEvent(
          events,
          `Bot #${newestBot.id} was removed; ${orderLabel(newestBot.order)} returned to pending.`,
          action.now,
        );
      } else {
        events = addEvent(events, `Idle bot #${newestBot.id} was removed.`, action.now);
      }

      return schedulePending({ ...state, now: action.now, pending, bots, events });
    }

    case "complete-order": {
      let completed = state.completed;
      let events = state.events;
      let changed = false;
      const bots = state.bots.map((bot) => {
        if (bot.id === action.botId && bot.status === "processing" && bot.finishAt <= action.now) {
          const completedOrder: Order = {
            ...bot.order,
            completedAt: action.now,
          };
          completed = [completedOrder, ...completed];
          events = addEvent(
            events,
            `Bot #${bot.id} completed ${orderLabel(bot.order)}.`,
            action.now,
          );
          changed = true;
          return { id: bot.id, status: "idle" } satisfies Bot;
        }

        return bot;
      });

      const nextState = { ...state, now: action.now, bots, completed, events };

      return changed ? schedulePending(nextState) : nextState;
    }
  }
}

export function orderLabel(order: Pick<Order, "id">): string {
  return `Order #${order.id}`;
}

export function formatTime(time: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(time);
}

function insertPending(pending: Order[], order: Order): Order[] {
  return [...pending, order].sort((a, b) => orderPriority(a) - orderPriority(b) || a.id - b.id);
}

function orderPriority(order: Pick<Order, "kind">): number {
  return order.kind === "vip" ? 0 : 1;
}

function schedulePending(state: State): State {
  let pending = state.pending;
  let events = state.events;

  const bots = state.bots.map((bot) => {
    if (bot.status === "processing" || pending.length === 0) {
      return bot;
    }

    const [order, ...remaining] = pending;
    pending = remaining;
    events = addEvent(events, `Bot #${bot.id} started ${orderLabel(order)}.`, state.now);

    return {
      id: bot.id,
      status: "processing",
      order: { ...order, startedAt: state.now },
      startedAt: state.now,
      finishAt: state.now + PROCESSING_MS,
    } satisfies Bot;
  });

  return { ...state, pending, bots, events };
}

function addEvent(events: string[], message: string, time: number): string[] {
  return [`${formatTime(time)} ${message}`, ...events].slice(0, MAX_EVENTS);
}
