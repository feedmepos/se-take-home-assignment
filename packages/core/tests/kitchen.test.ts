import { describe, it, expect } from 'vitest';
import { Kitchen } from '../src/services/Kitchen';
import { FakeClock } from '../src/clock/FakeClock';
import { OrderType, OrderStatus, BotStatus } from '../src/types';
import { PROCESSING_DURATION_MS } from '../src/types';

const setup = (startOrderId = 1) => {
  const clock = new FakeClock();
  const kitchen = new Kitchen(clock, startOrderId);
  return { clock, kitchen };
};

describe('Kitchen — order creation & priority', () => {
  it('places a new normal order into PENDING', () => {
    const { kitchen } = setup();
    const order = kitchen.createOrder(OrderType.NORMAL);
    expect(order.status).toBe(OrderStatus.PENDING);
    expect(kitchen.pendingOrders().map((o) => o.id)).toEqual([order.id]);
  });

  it('assigns unique, increasing order numbers', () => {
    const { kitchen } = setup(1001);
    const a = kitchen.createOrder(OrderType.NORMAL);
    const b = kitchen.createOrder(OrderType.VIP);
    const c = kitchen.createOrder(OrderType.NORMAL);
    expect([a.id, b.id, c.id]).toEqual([1001, 1002, 1003]);
  });

  it('orders a VIP ahead of existing normal orders but behind existing VIPs', () => {
    const { kitchen } = setup();
    const n1 = kitchen.createOrder(OrderType.NORMAL);
    const v1 = kitchen.createOrder(OrderType.VIP);
    const v2 = kitchen.createOrder(OrderType.VIP);
    expect(kitchen.pendingOrders().map((o) => o.id)).toEqual([v1.id, v2.id, n1.id]);
  });
});

describe('Kitchen — bot processing', () => {
  it('a bot picks up a pending order and completes it after 10 seconds', () => {
    const { clock, kitchen } = setup();
    const order = kitchen.createOrder(OrderType.NORMAL);
    kitchen.addBot();

    expect(order.status).toBe(OrderStatus.PROCESSING);

    clock.advance(PROCESSING_DURATION_MS - 1);
    expect(order.status).toBe(OrderStatus.PROCESSING);

    clock.advance(1);
    expect(order.status).toBe(OrderStatus.COMPLETE);
    expect(kitchen.completedOrders().map((o) => o.id)).toEqual([order.id]);
  });

  it('a bot becomes IDLE after completing when no orders remain', () => {
    const { clock, kitchen } = setup();
    kitchen.createOrder(OrderType.NORMAL);
    const bot = kitchen.addBot();
    clock.advance(PROCESSING_DURATION_MS);
    expect(bot.status).toBe(BotStatus.IDLE);
  });

  it('a newly added bot stays IDLE when there are no pending orders', () => {
    const { kitchen } = setup();
    const bot = kitchen.addBot();
    expect(bot.status).toBe(BotStatus.IDLE);
  });

  it('processes one order at a time and picks the next after completion', () => {
    const { clock, kitchen } = setup();
    const o1 = kitchen.createOrder(OrderType.NORMAL);
    const o2 = kitchen.createOrder(OrderType.NORMAL);
    kitchen.addBot();

    expect(o1.status).toBe(OrderStatus.PROCESSING);
    expect(o2.status).toBe(OrderStatus.PENDING);

    clock.advance(PROCESSING_DURATION_MS);
    expect(o1.status).toBe(OrderStatus.COMPLETE);
    expect(o2.status).toBe(OrderStatus.PROCESSING);

    clock.advance(PROCESSING_DURATION_MS);
    expect(o2.status).toBe(OrderStatus.COMPLETE);
  });

  it('two bots process two orders concurrently', () => {
    const { clock, kitchen } = setup();
    const o1 = kitchen.createOrder(OrderType.NORMAL);
    const o2 = kitchen.createOrder(OrderType.NORMAL);
    kitchen.addBot();
    kitchen.addBot();

    expect(o1.status).toBe(OrderStatus.PROCESSING);
    expect(o2.status).toBe(OrderStatus.PROCESSING);

    clock.advance(PROCESSING_DURATION_MS);
    expect(o1.status).toBe(OrderStatus.COMPLETE);
    expect(o2.status).toBe(OrderStatus.COMPLETE);
  });

  it('processes VIP order before a normal order', () => {
    const { clock, kitchen } = setup();
    const n = kitchen.createOrder(OrderType.NORMAL);
    const v = kitchen.createOrder(OrderType.VIP);
    kitchen.addBot();

    expect(v.status).toBe(OrderStatus.PROCESSING);
    expect(n.status).toBe(OrderStatus.PENDING);

    clock.advance(PROCESSING_DURATION_MS);
    expect(v.status).toBe(OrderStatus.COMPLETE);
    expect(n.status).toBe(OrderStatus.PROCESSING);
  });
});

describe('Kitchen — bot removal (requeue with preserved priority)', () => {
  it('destroys the newest bot', () => {
    const { kitchen } = setup();
    const b1 = kitchen.addBot();
    const b2 = kitchen.addBot();
    const removed = kitchen.removeBot();
    expect(removed?.id).toBe(b2.id);
    expect(kitchen.bots.map((b) => b.id)).toEqual([b1.id]);
  });

  it('returns the processing order back to PENDING when its bot is removed', () => {
    const { kitchen } = setup();
    const order = kitchen.createOrder(OrderType.NORMAL);
    kitchen.addBot();
    expect(order.status).toBe(OrderStatus.PROCESSING);

    kitchen.removeBot();
    expect(order.status).toBe(OrderStatus.PENDING);
    expect(kitchen.pendingOrders().map((o) => o.id)).toEqual([order.id]);
  });

  it('the requeued order keeps its priority position', () => {
    const { kitchen } = setup();
    const v = kitchen.createOrder(OrderType.VIP);
    const n = kitchen.createOrder(OrderType.NORMAL);
    kitchen.addBot(); // picks up VIP

    kitchen.removeBot(); // VIP returns to queue
    expect(kitchen.pendingOrders().map((o) => o.id)).toEqual([v.id, n.id]);
  });

  it('does not fire the original timer after the bot is removed', () => {
    const { clock, kitchen } = setup();
    const order = kitchen.createOrder(OrderType.NORMAL);
    kitchen.addBot();
    kitchen.removeBot();

    clock.advance(PROCESSING_DURATION_MS * 2);
    // order should still be pending (no ghost completion from the removed bot)
    expect(order.status).toBe(OrderStatus.PENDING);
  });

  it('a remaining bot picks up the requeued order', () => {
    const { clock, kitchen } = setup();
    const order = kitchen.createOrder(OrderType.NORMAL);
    kitchen.addBot(); // bot1 picks up
    kitchen.addBot(); // bot2 idle
    kitchen.removeBot(); // removes bot2 (idle) — order keeps processing on bot1

    expect(order.status).toBe(OrderStatus.PROCESSING);
    clock.advance(PROCESSING_DURATION_MS);
    expect(order.status).toBe(OrderStatus.COMPLETE);
  });

  it('returns null when removing a bot from an empty pool', () => {
    const { kitchen } = setup();
    expect(kitchen.removeBot()).toBeNull();
  });
});

describe('Kitchen — state snapshot', () => {
  it('reflects pending, processing, complete orders and bots', () => {
    const { clock, kitchen } = setup(1);
    const pendingOnly = kitchen.createOrder(OrderType.NORMAL);
    const processing = kitchen.createOrder(OrderType.VIP);
    const bot = kitchen.addBot(); // picks up the VIP (higher priority)

    let snap = kitchen.snapshot();
    expect(snap.pending.map((o) => o.id)).toEqual([pendingOnly.id]);
    expect(snap.processing.map((o) => o.id)).toEqual([processing.id]);
    expect(snap.complete).toEqual([]);
    expect(snap.bots).toEqual([
      { id: bot.id, status: BotStatus.PROCESSING, currentOrderId: processing.id },
    ]);

    clock.advance(PROCESSING_DURATION_MS);
    snap = kitchen.snapshot();
    expect(snap.complete.map((o) => o.id)).toEqual([processing.id]);
    expect(snap.processing.map((o) => o.id)).toEqual([pendingOnly.id]);
    expect(snap.bots[0]?.currentOrderId).toBe(pendingOnly.id);
  });

  it('exposes an idle bot with no current order in the snapshot', () => {
    const { kitchen } = setup();
    const bot = kitchen.addBot();
    const snap = kitchen.snapshot();
    expect(snap.processing).toEqual([]);
    expect(snap.bots).toEqual([{ id: bot.id, status: BotStatus.IDLE, currentOrderId: null }]);
  });
});

describe('Kitchen — domain events', () => {
  it('emits creation, pickup and completion events in order', () => {
    const { clock, kitchen } = setup(1001);
    const kinds: string[] = [];
    kitchen.on((e) => kinds.push(e.kind));

    kitchen.createOrder(OrderType.NORMAL);
    kitchen.addBot();
    clock.advance(PROCESSING_DURATION_MS);

    expect(kinds).toEqual(['OrderCreated', 'BotAdded', 'OrderPickedUp', 'OrderCompleted']);
  });

  it('emits BotRemoved and OrderRequeued when removing a busy bot', () => {
    const { kitchen } = setup();
    kitchen.createOrder(OrderType.NORMAL);
    kitchen.addBot();

    const kinds: string[] = [];
    kitchen.on((e) => kinds.push(e.kind));
    kitchen.removeBot();

    expect(kinds).toContain('OrderRequeued');
    expect(kinds).toContain('BotRemoved');
  });
});
