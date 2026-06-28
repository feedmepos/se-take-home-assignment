import { describe, expect, it } from 'vitest';
import {
  addBot,
  addOrder,
  completeOrders,
  createInitialState,
  pendingOrders,
  reconcile,
  removeBot,
} from './orderSystem';

const P = 10_000;

describe('order numbering (req 3)', () => {
  it('is unique and increasing', () => {
    let s = createInitialState();
    s = addOrder(s, 'NORMAL', 0);
    s = addOrder(s, 'VIP', 0);
    s = addOrder(s, 'NORMAL', 0);
    expect(s.orders.map((o) => o.id)).toEqual([1, 2, 3]);
  });
});

describe('VIP priority (req 2)', () => {
  it('places a VIP ahead of normals but behind earlier VIPs', () => {
    let s = createInitialState();
    s = addOrder(s, 'NORMAL', 0); // #1
    s = addOrder(s, 'VIP', 0); // #2
    s = addOrder(s, 'NORMAL', 0); // #3
    s = addOrder(s, 'VIP', 0); // #4
    expect(pendingOrders(s).map((o) => o.id)).toEqual([2, 4, 1, 3]);
  });
});

describe('bot processing (req 4, 5)', () => {
  it('immediately picks up the highest-priority order', () => {
    let s = createInitialState();
    s = addOrder(s, 'NORMAL', 0); // #1
    s = addOrder(s, 'VIP', 0); // #2
    s = reconcile(addBot(s), 0, P);
    expect(s.bots[0].orderId).toBe(2); // VIP first
    expect(s.orders.find((o) => o.id === 2)?.status).toBe('PROCESSING');
  });

  it('completes after processMs and then picks up the next order', () => {
    let s = createInitialState();
    s = addOrder(s, 'NORMAL', 0); // #1
    s = addOrder(s, 'NORMAL', 0); // #2
    s = reconcile(addBot(s), 0, P); // bot starts #1 at t=0
    s = reconcile(s, P, P); // t=10s -> #1 done, #2 starts
    expect(completeOrders(s).map((o) => o.id)).toEqual([1]);
    expect(s.orders.find((o) => o.id === 1)?.completedAt).toBe(P);
    expect(s.bots[0].orderId).toBe(2);
  });

  it('does not complete an order before processMs has elapsed', () => {
    let s = createInitialState();
    s = addOrder(s, 'NORMAL', 0);
    s = reconcile(addBot(s), 0, P);
    s = reconcile(s, P - 1, P);
    expect(completeOrders(s)).toHaveLength(0);
    expect(s.bots[0].orderId).toBe(1);
  });

  it('stays idle when there is no pending order', () => {
    let s = createInitialState();
    s = reconcile(addBot(s), 0, P);
    expect(s.bots[0].orderId).toBeNull();
  });
});

describe('removing a bot (req 6)', () => {
  it('returns the in-progress order to its original priority position', () => {
    let s = createInitialState();
    s = addOrder(s, 'VIP', 0); // #1
    s = addOrder(s, 'NORMAL', 0); // #2
    s = reconcile(addBot(s), 0, P); // bot cooks VIP #1
    expect(s.bots[0].orderId).toBe(1);

    s = removeBot(s); // newest (only) bot removed mid-cook
    expect(s.bots).toHaveLength(0);

    const order1 = s.orders.find((o) => o.id === 1);
    expect(order1?.status).toBe('PENDING');
    expect(order1?.startedAt).toBeUndefined();
    expect(pendingOrders(s).map((o) => o.id)).toEqual([1, 2]); // VIP back in front
  });

  it('removes only the newest bot', () => {
    let s = createInitialState();
    s = addBot(s); // bot 1
    s = addBot(s); // bot 2
    s = removeBot(s);
    expect(s.bots.map((b) => b.id)).toEqual([1]);
  });

  it('is a no-op when there are no bots', () => {
    const s = createInitialState();
    expect(removeBot(s)).toBe(s);
  });
});
