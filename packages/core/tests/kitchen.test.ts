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
      {
        id: bot.id,
        status: BotStatus.PROCESSING,
        currentOrderId: processing.id,
        processingTime: PROCESSING_DURATION_MS,
      },
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
    expect(snap.bots).toEqual([
      {
        id: bot.id,
        status: BotStatus.IDLE,
        currentOrderId: null,
        processingTime: PROCESSING_DURATION_MS,
      },
    ]);
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

describe('Kitchen — VIP earliest-finish dispatch (heterogeneous bot speeds)', () => {
  it('routes a VIP to a busy-but-faster bot when that finishes the order sooner', () => {
    // BotB(5s) 先忙、剩 2s;BotA(10s) 空闲。新 VIP 应等 B(共 7s) 而非立刻给 A(共 10s)。
    const { clock, kitchen } = setup();
    const fast = kitchen.addBot(5_000); // B
    kitchen.createOrder(OrderType.NORMAL); // B 接住,预计 t=5000 完成
    clock.advance(3_000); // t=3000:B 还差 2000ms
    const slow = kitchen.addBot(10_000); // A,空闲

    const vip = kitchen.createOrder(OrderType.VIP); // t=3000 创建
    // A finishAt=3000+10000=13000;B finishAt=5000+5000=10000 → 最优=B(忙) → VIP 等待,A 空转
    expect(vip.status).toBe(OrderStatus.PENDING);
    expect(slow.status).toBe(BotStatus.IDLE);

    clock.advance(2_000); // t=5000:B 完成 filler → 重新评估 → 派给 B
    expect(vip.status).toBe(OrderStatus.PROCESSING);
    expect(fast.currentOrder?.id).toBe(vip.id);

    clock.advance(5_000); // t=10000:B 完成 VIP
    expect(vip.status).toBe(OrderStatus.COMPLETE);
    expect(vip.completedAt).toBe(10_000);
    // 创建于 t=3000、完成于 t=10000 → 总耗时 7s(优于派给空闲 A 的 10s)。
    expect(vip.completedAt! - vip.createdAt).toBe(7_000);
  });

  it('when all bots are idle, a VIP goes to the fastest one', () => {
    const { kitchen } = setup();
    const slow = kitchen.addBot(10_000);
    const fast = kitchen.addBot(5_000);
    const vip = kitchen.createOrder(OrderType.VIP);
    expect(fast.currentOrder?.id).toBe(vip.id);
    expect(slow.status).toBe(BotStatus.IDLE);
  });

  it('on a finish-time tie, prefers an idle bot so the VIP can start immediately', () => {
    const { kitchen } = setup();
    const busy = kitchen.addBot(5_000); // 在 t=0 接 Normal → finishAt=5000;若给 VIP 则 5000+5000=10000
    kitchen.createOrder(OrderType.NORMAL);
    const idle = kitchen.addBot(10_000); // 空闲 → VIP finishAt=0+10000=10000(并列)
    const vip = kitchen.createOrder(OrderType.VIP);
    // 完成时刻并列(都 10000)→ 偏好空闲 bot,立即开工。
    expect(idle.currentOrder?.id).toBe(vip.id);
    expect(busy.currentOrder?.id).not.toBe(vip.id);
  });

  it('keeps a VIP strictly ahead of Normal: an idle bot does NOT grab the Normal while the VIP waits', () => {
    const { clock, kitchen } = setup();
    kitchen.addBot(5_000); // B
    kitchen.createOrder(OrderType.NORMAL); // B 接住,t=5000 完成
    clock.advance(3_000); // B 剩 2000ms
    const slow = kitchen.addBot(10_000); // A,空闲

    const vip = kitchen.createOrder(OrderType.VIP); // 最优=B(忙) → 等待
    const normal = kitchen.createOrder(OrderType.NORMAL); // 排在 VIP 之后

    // A 既不抢 Normal、也不降级接 VIP;两单都等待,VIP 严格在前。
    expect(vip.status).toBe(OrderStatus.PENDING);
    expect(normal.status).toBe(OrderStatus.PENDING);
    expect(slow.status).toBe(BotStatus.IDLE);
    expect(kitchen.pendingOrders().map((o) => o.id)).toEqual([vip.id, normal.id]);
  });

  it('spreads many VIPs across a busy fast bot and an idle slow bot (no idle waste, optimal backlog)', () => {
    // fast(5s) 正忙、剩 2s;slow(10s) 空闲。一次涌入 5 个 VIP。
    // 不应 5 个都死等 fast(空转 slow),而要按「完成最早」把队列最优分摊:
    // fast 吃 V1/V3/V4(完成 10s/15s/20s),slow 吃 V2/V5(完成 13s/23s)。
    const { clock, kitchen } = setup(1);
    const fast = kitchen.addBot(5_000);
    kitchen.createOrder(OrderType.NORMAL); // fast 接 filler,t=5000 完成
    clock.advance(3_000); // t=3000:fast 剩 2000ms
    const slow = kitchen.addBot(10_000); // 空闲

    const v1 = kitchen.createOrder(OrderType.VIP);
    const v2 = kitchen.createOrder(OrderType.VIP);
    const v3 = kitchen.createOrder(OrderType.VIP);
    const v4 = kitchen.createOrder(OrderType.VIP);
    const v5 = kitchen.createOrder(OrderType.VIP);

    // 关键:slow 立即分流处理 V2(不空转),fast 仍在跑 filler,其余 VIP 等待。
    expect(slow.currentOrder?.id).toBe(v2.id);
    expect(v2.status).toBe(OrderStatus.PROCESSING);
    expect(fast.status).toBe(BotStatus.PROCESSING); // 仍在 filler 上
    expect([v1, v3, v4, v5].map((o) => o.status)).toEqual(Array(4).fill(OrderStatus.PENDING));

    clock.advance(20_000); // 跑到全部完成(t=23000)

    // 每个 VIP 的最终完成时刻 = 最优分摊的结果。
    expect(v1.completedAt).toBe(10_000);
    expect(v2.completedAt).toBe(13_000);
    expect(v3.completedAt).toBe(15_000);
    expect(v4.completedAt).toBe(20_000);
    expect(v5.completedAt).toBe(23_000);
  });

  it('re-dispatches a waiting VIP to a remaining bot after the optimal (busy) bot is removed', () => {
    const { clock, kitchen } = setup();
    const slow = kitchen.addBot(10_000); // bot1
    kitchen.createOrder(OrderType.NORMAL); // slow 接住,t=10000 完成
    kitchen.addBot(5_000); // bot2(fast)
    kitchen.createOrder(OrderType.NORMAL); // fast 接住,t=5000 完成
    clock.advance(3_000); // t=3000:fast 剩 2000ms

    const vip = kitchen.createOrder(OrderType.VIP);
    // fast finishAt=5000+5000=10000;slow finishAt=10000+10000=20000 → 最优=fast(忙) → VIP 等待
    expect(vip.status).toBe(OrderStatus.PENDING);

    kitchen.removeBot(); // 移除最新 = fast(忙)→其 Normal 退回;仍无空闲 bot → VIP 继续等待
    expect(vip.status).toBe(OrderStatus.PENDING);

    clock.advance(7_000); // t=10000:slow 完成 → 重新评估 → 由仅剩的 slow 处理 VIP
    expect(vip.status).toBe(OrderStatus.PROCESSING);
    expect(slow.currentOrder?.id).toBe(vip.id);
  });
});
