import { describe, expect, it } from 'vitest';
import {
  addBot,
  addOrder,
  completeBotOrder,
  createInitialState,
  removeNewestBot,
  type ControllerState,
} from './orderController';

function pendingIds(state: ControllerState) {
  return state.pendingOrders.map((order) => order.id);
}

function completedIds(state: ControllerState) {
  return state.completedOrders.map((order) => order.id);
}

describe('orderController', () => {
  it('creates normal orders with unique increasing IDs', () => {
    const state = addOrder(addOrder(createInitialState(), 'normal'), 'normal');

    expect(pendingIds(state)).toEqual([1, 2]);
    expect(state.nextOrderId).toBe(3);
  });

  it('queues VIP orders before normal orders and behind older VIP orders', () => {
    let state = createInitialState();
    state = addOrder(state, 'normal');
    state = addOrder(state, 'vip');
    state = addOrder(state, 'normal');
    state = addOrder(state, 'vip');

    expect(state.pendingOrders.map((order) => `${order.type}-${order.id}`)).toEqual([
      'vip-2',
      'vip-4',
      'normal-1',
      'normal-3',
    ]);
  });

  it('assigns pending orders immediately when a bot is added', () => {
    let state = createInitialState();
    state = addOrder(state, 'normal');
    state = addBot(state);

    expect(state.pendingOrders).toEqual([]);
    expect(state.bots).toEqual([
      { id: 1, status: 'processing', order: { id: 1, type: 'normal' } },
    ]);
  });

  it('lets multiple bots process one order each', () => {
    let state = createInitialState();
    state = addOrder(state, 'normal');
    state = addOrder(state, 'normal');
    state = addOrder(state, 'normal');
    state = addBot(state);
    state = addBot(state);

    expect(state.bots.map((bot) => bot.order?.id)).toEqual([1, 2]);
    expect(pendingIds(state)).toEqual([3]);
  });

  it('moves completed orders to COMPLETE and starts the next pending order', () => {
    let state = createInitialState();
    state = addOrder(state, 'normal');
    state = addOrder(state, 'normal');
    state = addBot(state);
    state = completeBotOrder(state, 1, 1);

    expect(completedIds(state)).toEqual([1]);
    expect(state.bots[0]).toEqual({
      id: 1,
      status: 'processing',
      order: { id: 2, type: 'normal' },
    });
    expect(state.pendingOrders).toEqual([]);
  });

  it('removes the newest idle bot without changing orders', () => {
    let state = createInitialState();
    state = addBot(state);
    state = addBot(state);
    state = removeNewestBot(state);

    expect(state.bots.map((bot) => bot.id)).toEqual([1]);
    expect(state.pendingOrders).toEqual([]);
  });

  it('returns a newest processing bot order to pending in priority order', () => {
    let state = createInitialState();
    state = addOrder(state, 'normal');
    state = addOrder(state, 'vip');
    state = addOrder(state, 'normal');
    state = addBot(state);
    state = addBot(state);
    state = removeNewestBot(state);

    expect(state.bots.map((bot) => bot.id)).toEqual([1]);
    expect(state.bots[0].order).toEqual({ id: 2, type: 'vip' });
    expect(state.pendingOrders.map((order) => `${order.type}-${order.id}`)).toEqual([
      'normal-1',
      'normal-3',
    ]);
  });

  it('reassigns a returned VIP order to remaining idle bots', () => {
    let state = createInitialState();
    state = addBot(state);
    state = addBot(state);
    state = addOrder(state, 'vip');
    state = removeNewestBot(state);

    expect(state.bots).toEqual([
      { id: 1, status: 'processing', order: { id: 1, type: 'vip' } },
    ]);
    expect(state.pendingOrders).toEqual([]);
  });

  it('ignores stale completion events with a wrong order ID', () => {
    let state = createInitialState();
    state = addOrder(state, 'normal');
    state = addBot(state);

    const unchanged = completeBotOrder(state, 1, 99);

    expect(unchanged).toEqual(state);
    expect(completedIds(unchanged)).toEqual([]);
    expect(unchanged.bots[0].order).toEqual({ id: 1, type: 'normal' });
  });

  it('ignores completion events for removed bots', () => {
    let state = createInitialState();
    state = addOrder(state, 'normal');
    state = addBot(state);
    state = removeNewestBot(state);

    state = completeBotOrder(state, 1, 1);

    expect(completedIds(state)).toEqual([]);
    expect(pendingIds(state)).toEqual([1]);
  });
});
