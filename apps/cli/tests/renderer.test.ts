import { describe, it, expect } from 'vitest';
import { createEventRenderer } from '../src/renderer';
import { OrderType, OrderStatus, type DomainEvent } from '@feedme/core';

const t = '14:32:01';

describe('createEventRenderer', () => {
  it('renders an order creation line', () => {
    const render = createEventRenderer();
    const event: DomainEvent = {
      kind: 'OrderCreated',
      at: 0,
      order: {
        id: 1002,
        type: OrderType.VIP,
        status: OrderStatus.PENDING,
        createdAt: 0,
        completedAt: null,
      },
    };
    expect(render(event, t)).toBe('[14:32:01] Created VIP Order #1002 - Status: PENDING');
  });

  it('remembers order type for a later pickup line', () => {
    const render = createEventRenderer();
    render(
      {
        kind: 'OrderCreated',
        at: 0,
        order: {
          id: 1002,
          type: OrderType.VIP,
          status: OrderStatus.PENDING,
          createdAt: 0,
          completedAt: null,
        },
      },
      t,
    );
    const line = render({ kind: 'OrderPickedUp', at: 0, orderId: 1002, botId: 1 }, t);
    expect(line).toBe('[14:32:01] Bot #1 picked up VIP Order #1002 - Status: PROCESSING');
  });

  it('renders a completion line', () => {
    const render = createEventRenderer();
    render(
      {
        kind: 'OrderCreated',
        at: 0,
        order: {
          id: 1001,
          type: OrderType.NORMAL,
          status: OrderStatus.PENDING,
          createdAt: 0,
          completedAt: null,
        },
      },
      t,
    );
    const line = render({ kind: 'OrderCompleted', at: 0, orderId: 1001, botId: 2 }, t);
    expect(line).toBe('[14:32:01] Bot #2 completed Normal Order #1001 - Status: COMPLETE');
  });

  it('renders bot added and removed lines', () => {
    const render = createEventRenderer();
    expect(render({ kind: 'BotAdded', at: 0, botId: 1 }, t)).toBe(
      '[14:32:01] Bot #1 created - Status: ACTIVE',
    );
    expect(render({ kind: 'BotRemoved', at: 0, botId: 1 }, t)).toBe('[14:32:01] Bot #1 destroyed');
  });

  it('renders a requeue line', () => {
    const render = createEventRenderer();
    const line = render({ kind: 'OrderRequeued', at: 0, orderId: 1004, botId: 2 }, t);
    expect(line).toBe(
      '[14:32:01] Order #1004 returned to queue (Bot #2 removed) - Status: PENDING',
    );
  });
});
