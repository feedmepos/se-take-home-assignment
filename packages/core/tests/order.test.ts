import { describe, it, expect } from 'vitest';
import { Order } from '../src/models/Order';
import { OrderType, OrderStatus } from '../src/types';

describe('Order', () => {
  it('is PENDING when created', () => {
    const order = new Order(1, OrderType.NORMAL, 0);
    expect(order.status).toBe(OrderStatus.PENDING);
    expect(order.completedAt).toBeNull();
  });

  it('transitions to PROCESSING', () => {
    const order = new Order(1, OrderType.NORMAL, 0);
    order.markProcessing();
    expect(order.status).toBe(OrderStatus.PROCESSING);
  });

  it('transitions to COMPLETE and records completion time', () => {
    const order = new Order(1, OrderType.NORMAL, 0);
    order.markProcessing();
    order.markComplete(10_000);
    expect(order.status).toBe(OrderStatus.COMPLETE);
    expect(order.completedAt).toBe(10_000);
  });

  it('can return to PENDING when requeued', () => {
    const order = new Order(1, OrderType.VIP, 0);
    order.markProcessing();
    order.markPending();
    expect(order.status).toBe(OrderStatus.PENDING);
  });
});
