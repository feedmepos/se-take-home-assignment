"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Bot, Order, OrderType } from "../types";
import { PROCESSING_TIME_MS } from "../types";

interface State {
  pendingOrders: Order[];
  completeOrders: Order[];
  bots: Bot[];
}

// VIPs queue behind earlier VIPs but ahead of any normal orders.
function insertWithPriority(list: Order[], order: Order): Order[] {
  if (order.type !== "vip") return [...list, order];
  const lastVip = list.reduce((acc, o, i) => (o.type === "vip" ? i : acc), -1);
  const next = [...list];
  next.splice(lastVip + 1, 0, order);
  return next;
}

// Insert order keeping VIP/Normal priority. Within same type, smaller id (older) goes first.
// function insertWithPriority(list: Order[], order: Order): Order[] {
//   let insertAt: number;
//   if (order.type === "vip") {
//     insertAt = list.findIndex((o) => o.type === "vip" && o.id > order.id);
//     if (insertAt === -1) {
//       const firstNormal = list.findIndex((o) => o.type === "normal");
//       insertAt = firstNormal === -1 ? list.length : firstNormal;
//     }
//   } else {
//     insertAt = list.findIndex((o) => o.type === "normal" && o.id > order.id);
//     if (insertAt === -1) insertAt = list.length;
//   }
//   const next = [...list];
//   next.splice(insertAt, 0, order);
//   return next;
// }

// Match idle bots with pending orders. Pure — safe inside setState updaters.
function assign(s: State): State {
  if (!s.pendingOrders.length || !s.bots.some((b) => b.status === "idle")) return s;
  const queue = [...s.pendingOrders];
  const bots = s.bots.map((b) =>
    b.status === "idle" && queue.length
      ? { ...b, status: "processing" as const, order: queue.shift()!, startTime: Date.now(), progress: 0 }
      : b
  );
  return { ...s, pendingOrders: queue, bots };
}

export function useOrderController() {
  const [state, setState] = useState<State>({ pendingOrders: [], completeOrders: [], bots: [] });
  const nextOrderId = useRef(1);
  const nextBotId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const completeOrder = useCallback((botId: number) => {
    setState((s) => {
      const bot = s.bots.find((b) => b.id === botId);
      if (!bot?.order) return s;
      timers.current.delete(botId);
      return assign({
        ...s,
        completeOrders: [...s.completeOrders, { ...bot.order, completedAt: new Date() }],
        bots: s.bots.map((b) =>
          b.id === botId ? { ...b, status: "idle" as const, order: null, startTime: null, progress: 0 } : b
        ),
      });
    });
  }, []);

  const addOrder = useCallback((type: OrderType) => {
    const newOrder = { id: nextOrderId.current++, type, createdAt: new Date() };
    setState((s) =>
      assign({
        ...s,
        pendingOrders: insertWithPriority(s.pendingOrders,newOrder),
      })
    );
  }, []);

  const addBot = useCallback(() => {
    const newBot = { id: nextBotId.current++, status: "idle" as const, order: null, startTime: null, progress: 0 };
    setState((s) =>
      assign({
        ...s,
        bots: [
          ...s.bots,
          newBot,
        ],
      })
    );
  }, []);

  const removeBot = useCallback(() => {
    setState((s) => {
      if (!s.bots.length) return s;
      const last = s.bots[s.bots.length - 1];
      const bots = s.bots.slice(0, -1);
      const timer = timers.current.get(last.id);
      if (timer) {
        clearTimeout(timer);
        timers.current.delete(last.id);
      }
      return last.status === "processing" && last.order
        ? { ...s, bots, pendingOrders: insertWithPriority(s.pendingOrders, last.order) }
        : { ...s, bots };
    });
  }, []);

  // Start a timer for any processing bot that doesn't have one yet.
  // Idempotent — safe under StrictMode.
  useEffect(() => {
    state.bots.forEach((b) => {
      if (b.status === "processing" && !timers.current.has(b.id)) {
        timers.current.set(b.id, setTimeout(() => completeOrder(b.id), PROCESSING_TIME_MS));
      }
    });
  }, [state.bots, completeOrder]);

  // Visual progress ticker.
  const hasProcessing = state.bots.some((b) => b.status === "processing");
  useEffect(() => {
    if (!hasProcessing) return;
    const id = setInterval(() => {
      setState((s) => ({
        ...s,
        bots: s.bots.map((b) =>
          b.status === "processing" && b.startTime
            ? { ...b, progress: Math.min(100, ((Date.now() - b.startTime) / PROCESSING_TIME_MS) * 100) }
            : b
        ),
      }));
    }, 500);
    return () => clearInterval(id);
  }, [hasProcessing]);

  // Clear all timers on unmount.
  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach(clearTimeout);
      map.clear();
    };
  }, []);

  return { ...state, addOrder, addBot, removeBot };
}
