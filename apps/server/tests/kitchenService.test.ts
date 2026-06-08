import { describe, it, expect } from 'vitest';
import { KitchenService } from '../src/application/KitchenService';
import { FakeClock, OrderType, OrderStatus, PROCESSING_DURATION_MS } from '@feedme/core';

describe('KitchenService', () => {
  it('exposes a created order in the pending state', () => {
    const svc = new KitchenService(new FakeClock());
    const order = svc.createOrder(OrderType.NORMAL);
    expect(svc.getState().pending.map((o) => o.id)).toEqual([order.id]);
  });

  it('drives processing to completion via the injected clock', () => {
    const clock = new FakeClock();
    const svc = new KitchenService(clock);
    const order = svc.createOrder(OrderType.NORMAL);
    svc.addBot();
    clock.advance(PROCESSING_DURATION_MS);

    const state = svc.getState();
    expect(state.complete.map((o) => o.id)).toEqual([order.id]);
    expect(state.pending).toHaveLength(0);
  });

  it('forwards domain events to subscribers', () => {
    const svc = new KitchenService(new FakeClock());
    const kinds: string[] = [];
    svc.onEvent((e) => kinds.push(e.kind));
    svc.createOrder(OrderType.VIP);
    expect(kinds).toContain('OrderCreated');
  });

  it('returns the removed bot', () => {
    const svc = new KitchenService(new FakeClock());
    const bot = svc.addBot();
    expect(svc.removeBot()?.id).toBe(bot.id);
    void OrderStatus;
  });
});
