import { describe, expect, it } from 'vitest';
import { BotStatus, OrderStatus, OrderType, type Bot, type Order } from '@/domain';
import { initialState } from '../state';
import { assignBots } from './assign-bots';

const order = (id: number, type: OrderType): Order => ({
  id,
  type,
  status: OrderStatus.PENDING,
});
const idleBot = (id: number): Bot => ({
  id,
  status: BotStatus.IDLE,
  currentOrderId: null,
});

describe('assign-bots', () => {
  it('fills idle bots (by id) with pending orders in priority order', () => {
    const state = {
      ...initialState,
      orders: [order(1, OrderType.NORMAL), order(2, OrderType.VIP)],
      bots: [idleBot(1), idleBot(2)],
    };
    const next = assignBots(state);

    // Lower-id bot takes the higher-priority (VIP) order.
    expect(next.bots.find((b) => b.id === 1)?.currentOrderId).toBe(2);
    expect(next.bots.find((b) => b.id === 2)?.currentOrderId).toBe(1);
    expect(
      next.orders.every((o) => o.status === OrderStatus.PROCESSING),
    ).toBe(true);
  });

  it('returns the same reference when there is nothing to assign', () => {
    const state = { ...initialState, bots: [idleBot(1)] };
    expect(assignBots(state)).toBe(state);
  });

  it('only assigns as many orders as there are idle bots', () => {
    const state = {
      ...initialState,
      orders: [order(1, OrderType.VIP), order(2, OrderType.VIP)],
      bots: [idleBot(1)],
    };
    const next = assignBots(state);
    const processing = next.orders.filter(
      (o) => o.status === OrderStatus.PROCESSING,
    );
    expect(processing).toHaveLength(1);
    expect(processing[0].id).toBe(1);
  });
});
