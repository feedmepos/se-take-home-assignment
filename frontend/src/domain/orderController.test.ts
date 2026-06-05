import { describe, expect, it } from 'vitest';
import {
  addBot,
  addOrder,
  completeOrder,
  createInitialState,
  removeBot,
} from './orderController';
import { getPendingOrders } from './queue';
import { INITIAL_ORDER_ID } from './types';

describe('orderController', () => {
  it('creates normal orders with increasing ids', () => {
    const first = addOrder(createInitialState(), 'NORMAL');
    const second = addOrder(first, 'NORMAL');

    expect(first.nextOrderId).toBe(INITIAL_ORDER_ID + 1);
    expect(second.nextOrderId).toBe(INITIAL_ORDER_ID + 2);
    expect(getPendingOrders(second).map((order) => order.id)).toEqual([
      INITIAL_ORDER_ID,
      INITIAL_ORDER_ID + 1,
    ]);
  });

  it('places vip orders ahead of normal orders', () => {
    let state = addOrder(createInitialState(), 'NORMAL');
    state = addOrder(state, 'VIP');
    state = addOrder(state, 'NORMAL');

    expect(getPendingOrders(state).map((order) => order.type)).toEqual([
      'VIP',
      'NORMAL',
      'NORMAL',
    ]);
  });

  it('keeps vip orders in fifo order among themselves', () => {
    let state = addOrder(createInitialState(), 'VIP');
    state = addOrder(state, 'VIP');

    expect(getPendingOrders(state).map((order) => order.id)).toEqual([
      INITIAL_ORDER_ID,
      INITIAL_ORDER_ID + 1,
    ]);
  });

  it('assigns pending orders when a bot is added', () => {
    let state = addOrder(createInitialState(), 'VIP');
    state = addOrder(state, 'NORMAL');
    state = addBot(state);

    expect(state.bots).toHaveLength(1);
    expect(state.bots[0].status).toBe('PROCESSING');
    expect(state.bots[0].currentOrder?.type).toBe('VIP');
    expect(getPendingOrders(state)).toHaveLength(1);
  });

  it('moves completed orders and assigns the next pending order', () => {
    let state = addOrder(createInitialState(), 'VIP');
    state = addOrder(state, 'NORMAL');
    state = addBot(state);

    const botId = state.bots[0].id;
    const orderId = state.bots[0].currentOrder!.id;
    state = completeOrder(state, botId, orderId);

    expect(state.completedOrders).toHaveLength(1);
    expect(state.bots[0].status).toBe('PROCESSING');
    expect(state.bots[0].currentOrder?.type).toBe('NORMAL');
  });

  it('restores a processing order when the newest bot is removed', () => {
    let state = addOrder(createInitialState(), 'VIP');
    state = addOrder(state, 'NORMAL');
    state = addBot(state);

    const processingOrderId = state.bots[0].currentOrder!.id;
    state = removeBot(state);

    expect(state.bots).toHaveLength(0);
    expect(getPendingOrders(state).map((order) => order.id)).toEqual([
      processingOrderId,
      INITIAL_ORDER_ID + 1,
    ]);
  });

  it('removes the newest bot when multiple bots exist', () => {
    let state = addBot(createInitialState());
    state = addBot(state);

    state = removeBot(state);

    expect(state.bots).toHaveLength(1);
    expect(state.bots[0].id).toBe(1);
  });
});
