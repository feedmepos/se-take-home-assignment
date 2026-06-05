import { describe, expect, it } from 'vitest';
import {
  dequeueNextOrder,
  enqueueOrder,
  getPendingOrders,
  restoreOrderToQueue,
} from './queue';
import { createInitialState } from './orderController';

describe('queue', () => {
  it('merges vip queue before normal queue for display', () => {
    let state = enqueueOrder(createInitialState(), 'NORMAL', 1001);
    state = enqueueOrder(state, 'VIP', 1002);
    state = enqueueOrder(state, 'NORMAL', 1003);

    expect(getPendingOrders(state).map((order) => order.id)).toEqual([1002, 1001, 1003]);
  });

  it('dequeues vip orders before normal orders', () => {
    let state = enqueueOrder(createInitialState(), 'NORMAL', 1001);
    state = enqueueOrder(state, 'VIP', 1002);

    const first = dequeueNextOrder(state);
    expect(first.order?.id).toBe(1002);
    expect(first.savedPosition).toEqual({ queue: 'vip', index: 0 });

    const second = dequeueNextOrder(first.state);
    expect(second.order?.id).toBe(1001);
    expect(second.savedPosition).toEqual({ queue: 'normal', index: 0 });
  });

  it('restores a cancelled order to the front of its sub-queue', () => {
    let state = enqueueOrder(createInitialState(), 'VIP', 1001);
    state = enqueueOrder(state, 'VIP', 1002);

    const picked = dequeueNextOrder(state);
    state = enqueueOrder(picked.state, 'VIP', 1003);

    const restored = restoreOrderToQueue(state, {
      ...picked.order!,
      status: 'PROCESSING',
      savedQueuePosition: picked.savedPosition!,
    });

    expect(restored.vipQueue.map((order) => order.id)).toEqual([1001, 1002, 1003]);
  });
});
