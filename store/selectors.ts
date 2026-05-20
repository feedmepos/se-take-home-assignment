import type { AppState, Bot, Order } from '../types';

export function getPendingOrders(state: AppState): Order[] {
  return state.orders.filter((order) => order.status === 'pending');
}

export function getProcessingOrders(state: AppState): Order[] {
  return state.orders.filter((order) => order.status === 'processing');
}

export function getCompletedOrders(state: AppState): Order[] {
  return state.orders.filter((order) => order.status === 'complete');
}

export function getNextPendingOrder(state: AppState): Order | null {
  return getPendingOrders(state)[0] ?? null;
}

export function getIdleBots(state: AppState): Bot[] {
  return state.bots.filter((bot) => bot.status === 'idle');
}
