import type { AppState, Order, OrderType, QueuePosition } from './types';

export function getPendingOrders(state: AppState): Order[] {
  return [...state.vipQueue, ...state.normalQueue];
}

export function hasPendingOrders(state: AppState): boolean {
  return state.vipQueue.length > 0 || state.normalQueue.length > 0;
}

export function enqueueOrder(state: AppState, type: OrderType, id: number): AppState {
  const order: Order = { id, type, status: 'PENDING' };

  if (type === 'VIP') {
    return { ...state, vipQueue: [...state.vipQueue, order] };
  }

  return { ...state, normalQueue: [...state.normalQueue, order] };
}

export function dequeueNextOrder(state: AppState): {
  state: AppState;
  order: Order | null;
  savedPosition: QueuePosition | null;
} {
  if (state.vipQueue.length > 0) {
    const order = state.vipQueue[0];
    const savedPosition: QueuePosition = { queue: 'vip', index: 0 };
    return {
      state: { ...state, vipQueue: state.vipQueue.slice(1) },
      order,
      savedPosition,
    };
  }

  if (state.normalQueue.length > 0) {
    const order = state.normalQueue[0];
    const savedPosition: QueuePosition = { queue: 'normal', index: 0 };
    return {
      state: { ...state, normalQueue: state.normalQueue.slice(1) },
      order,
      savedPosition,
    };
  }

  return { state, order: null, savedPosition: null };
}

export function restoreOrderToQueue(state: AppState, order: Order): AppState {
  const position = order.savedQueuePosition;
  if (!position) {
    return state;
  }

  const restored: Order = {
    ...order,
    status: 'PENDING',
    savedQueuePosition: undefined,
  };

  if (position.queue === 'vip') {
    const vipQueue = [...state.vipQueue];
    vipQueue.splice(position.index, 0, restored);
    return { ...state, vipQueue };
  }

  const normalQueue = [...state.normalQueue];
  normalQueue.splice(position.index, 0, restored);
  return { ...state, normalQueue };
}
