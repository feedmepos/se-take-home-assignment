import type { Order, Bot } from "./types";

// ── Array helpers ──

export function insertAt<T>(arr: T[], index: number, item: T): T[] {
  return [...arr.slice(0, index), item, ...arr.slice(index)];
}

export function updateWhere<T>(
  arr: T[],
  predicate: (item: T) => boolean,
  updater: (item: T) => T,
): T[] {
  return arr.map((item) => (predicate(item) ? updater(item) : item));
}

export function removeWhere<T>(
  arr: T[],
  predicate: (item: T) => boolean,
): T[] {
  return arr.filter((item) => !predicate(item));
}

// ── Order finders ──

export function findOrder(orders: Order[], id: number): Order | undefined {
  return orders.find((o) => o.id === id);
}

export function findFirstPending(orders: Order[]): Order | undefined {
  return orders.find((o) => o.status === "PENDING");
}

// ── Bot finders ──

export function findBot(bots: Bot[], id: number): Bot | undefined {
  return bots.find((b) => b.id === id);
}

export function findIdleBots(bots: Bot[]): Bot[] {
  return bots
    .filter((b) => b.status === "IDLE")
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function findBotForOrder(bots: Bot[], orderId: number): Bot | undefined {
  return bots.find((b) => b.processingOrderId === orderId);
}

// ── Order status transitions ──

export function markProcessing(order: Order): Order {
  return { ...order, status: "PROCESSING", startedAt: Date.now() };
}

export function markPending(order: Order): Order {
  return { ...order, status: "PENDING", startedAt: undefined };
}

export function markComplete(order: Order): Order {
  return { ...order, status: "COMPLETE", startedAt: undefined };
}

// ── Bot status transitions ──

export function assignBot(bot: Bot, orderId: number): Bot {
  return { ...bot, status: "PROCESSING", processingOrderId: orderId };
}

export function idleBot(bot: Bot): Bot {
  return { ...bot, status: "IDLE", processingOrderId: undefined };
}

// ── createdAt comparison ──

export function createdEarlier(a: Order, b: Order): Order {
  return a.createdAt <= b.createdAt ? a : b;
}

export function createdLatest(a: Order, b: Order): Order {
  return a.createdAt > b.createdAt ? a : b;
}
