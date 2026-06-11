import { create } from 'zustand';
import type { Order, Bot, KitchenState } from '@/types';
import { PROCESSING_TIME_MS, TICK_INTERVAL_MS, ORDER_NUMBER_WRAP } from '@/constants';

// ---- Helpers ----

function generateOrderNumber(counter: number): number {
  return ((counter - 1) % ORDER_NUMBER_WRAP) + 1;
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

// ---- Store ----

interface KitchenStore extends KitchenState {
  addNormalOrder: () => void;
  addVipOrder: () => void;
  addBot: () => void;
  removeBot: () => void;
}

export const useKitchenStore = create<KitchenStore>((set) => {
  // Processing engine
  
   setInterval(() => {
    const now = Date.now();
    set((s) => {
      let { orders, bots } = s;

      // Complete finished orders
      let changed = false;
      const nextOrders = orders.map((o) => {
        if (o.status === 'PROCESSING' && o.processingStartedAt !== null && now - o.processingStartedAt >= PROCESSING_TIME_MS) {
          changed = true;
          return { ...o, status: 'COMPLETE' as const, processingStartedAt: null, processingBotId: null, completedAt: now };
        }
        return o;
      });

      // Free bots whose orders completed
      const nextBots = bots.map((b) => {
        if (b.status === 'PROCESSING' && b.currentOrderId) {
          const order = nextOrders.find((o) => o.id === b.currentOrderId);
          if (!order || order.status !== 'PROCESSING') {
            changed = true;
            return { ...b, status: 'IDLE' as const, currentOrderId: null };
          }
        }
        return b;
      });

      // Assign idle bots
      orders = nextOrders;
      bots = nextBots;
      for (const bot of bots) {
        if (bot.status !== 'IDLE') continue;
        const result = assignNextPendingToBot(orders, bots, bot.id, now);
        if (result.orders === orders) break;
        changed = true;
        orders = result.orders;
        bots = result.bots;
      }

      // Only create new references when state actually transitions
      if (!changed) return { tickCounter: s.tickCounter + 1 };
      return { orders, bots, tickCounter: s.tickCounter + 1 };
    });
  }, TICK_INTERVAL_MS);

  return {
    orders: [],
    bots: [],
    orderIdCounter: 0,
    botIdCounter: 0,
    tickCounter: 0,

    addNormalOrder: () =>
      set((s) => {
        const counter = s.orderIdCounter + 1;
        return { orders: [...s.orders, createOrder(counter, 'NORMAL')], orderIdCounter: counter };
      }),

    addVipOrder: () =>
      set((s) => {
        const counter = s.orderIdCounter + 1;
        return { orders: [...s.orders, createOrder(counter, 'VIP')], orderIdCounter: counter };
      }),

    addBot: () =>
      set((s) => {
        const botId = s.botIdCounter + 1;
        const bot: Bot = { id: botId, status: 'IDLE', currentOrderId: null };
        const result = assignNextPendingToBot(s.orders, [...s.bots, bot], botId, Date.now());
        return { orders: result.orders, bots: result.bots, botIdCounter: botId };
      }),

    removeBot: () =>
      set((s) => {
        if (s.bots.length === 0) return {};
        const botIndex = s.bots.reduce((maxIdx, bot, idx) => (bot.id > s.bots[maxIdx].id ? idx : maxIdx), 0);
        const removedBot = s.bots[botIndex];
        let orders = s.orders;
        if (removedBot.currentOrderId) {
          orders = orders.map((o) =>
            o.id === removedBot.currentOrderId
              ? { ...o, status: 'PENDING' as const, processingStartedAt: null, processingBotId: null }
              : o
          );
        }
        return { orders, bots: s.bots.filter((_, i) => i !== botIndex) };
      }),
  };
});
