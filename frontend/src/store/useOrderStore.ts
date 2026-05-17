import { create } from "zustand";

export type OrderType = "VIP" | "NORMAL";
export type OrderStatus = "PENDING" | "PROCESSING" | "COMPLETE";

export interface Order {
  id: number;
  displayId: string;
  type: OrderType;
  status: OrderStatus;
}

export interface Bot {
  id: number;
  status: "IDLE" | "BUSY";
  currentOrderId?: number;
  timeoutRef?: ReturnType<typeof setTimeout>;
}

interface OrderStore {
  orders: Order[];
  vipQueue: number[];
  normalQueue: number[];
  bots: Bot[];
  nextOrderId: number;
  nextBotId: number;
  resumeQueue: number[];

  addOrder: (type: OrderType) => void;
  addBot: () => void;
  removeBot: () => void;
  dispatch: () => void;
}

export const useOrderStore = create<OrderStore>((set, get) => ({
  orders: [],
  vipQueue: [],
  normalQueue: [],
  bots: [],
  nextOrderId: 1,
  nextBotId: 1,
  // Cancelled orders should resume before new VIP orders
  resumeQueue: [],

  addOrder: (type) => {
    const id = get().nextOrderId;
    const displayId = `${type === "VIP" ? "V" : "N"}${id}`;

    const newOrder: Order = {
      id,
      displayId,
      type,
      status: "PENDING",
    };

    set((state) => ({
      orders: [...state.orders, newOrder],
      nextOrderId: state.nextOrderId + 1,
      vipQueue: type === "VIP" ? [...state.vipQueue, id] : state.vipQueue,
      normalQueue:
        type === "NORMAL" ? [...state.normalQueue, id] : state.normalQueue,
    }));

    // Try to assign work whenever state changes
    get().dispatch();
  },

  addBot: () => {
    const id = get().nextBotId;

    const newBot: Bot = {
      id,
      status: "IDLE",
    };

    set((state) => ({
      bots: [...state.bots, newBot],
      nextBotId: state.nextBotId + 1,
    }));

    get().dispatch();
  },

  removeBot: () => {
    const bots = get().bots;
    if (bots.length === 0) return;

    const botToRemove = bots[bots.length - 1];

    // If bot is processing, gets cancelled, add it to resume queue for it to be picked up by next available bot
    if (botToRemove.status === "BUSY" && botToRemove.currentOrderId) {
      const orderId = botToRemove.currentOrderId;

      if (botToRemove.timeoutRef) clearTimeout(botToRemove.timeoutRef);

      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === orderId ? { ...o, status: "PENDING" } : o,
        ),
        // ensure cancelled order is next to process
        resumeQueue: [
          orderId,
          ...state.resumeQueue.filter((id) => id !== orderId),
        ],
      }));
    }

    // Remove newest bot
    set((state) => ({
      bots: state.bots.slice(0, -1),
    }));

    get().dispatch();
  },

  dispatch: () => {
    const { bots } = get();

    bots.forEach((bot) => {
      if (bot.status !== "IDLE") return;

      let orderId: number | undefined;

      // Always read fresh state here to avoid stale queue issues
      const state = get();

      if (state.resumeQueue.length > 0) {
        orderId = state.resumeQueue[0];
        set((s) => ({ resumeQueue: s.resumeQueue.slice(1) }));
      } else if (state.vipQueue.length > 0) {
        orderId = state.vipQueue[0];
        set((s) => ({ vipQueue: s.vipQueue.slice(1) }));
      } else if (state.normalQueue.length > 0) {
        orderId = state.normalQueue[0];
        set((s) => ({ normalQueue: s.normalQueue.slice(1) }));
      }

      if (orderId === undefined) return;

      set((s) => ({
        orders: s.orders.map((o) =>
          o.id === orderId ? { ...o, status: "PROCESSING" } : o,
        ),
        bots: s.bots.map((b) =>
          b.id === bot.id
            ? { ...b, status: "BUSY", currentOrderId: orderId }
            : b,
        ),
      }));

      const timeoutRef = setTimeout(() => {
        const currentBots = get().bots;
        const stillSameBot = currentBots.find((b) => b.id === bot.id);

        // Guard against race condition: If bot was removed or reassigned, do not complete the order.
        if (!stillSameBot || stillSameBot.currentOrderId !== orderId) return;

        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === orderId ? { ...o, status: "COMPLETE" } : o,
          ),
          bots: s.bots.map((b) =>
            b.id === bot.id
              ? {
                  ...b,
                  status: "IDLE",
                  currentOrderId: undefined,
                  timeoutRef: undefined,
                }
              : b,
          ),
        }));

        get().dispatch();
      }, 10000);

      set((s) => ({
        bots: s.bots.map((b) => (b.id === bot.id ? { ...b, timeoutRef } : b)),
      }));
    });
  },
}));
