import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { OrderController, Orders, Order } from '../src/v1.js';
import type { Clock } from '../src/v1.js';

function makeOrder(id: number, type: 'normal' | 'vip'): Order {
  return new Order(id, type);
}

function fakeClock(): { clock: Clock; advance(ms: number): void } {
  const pending: { fn: () => void; at: number }[] = [];
  let now = 0;

  return {
    clock: {
      now: () => now,
      setTimeout(fn, ms) {
        const handle = { fn: fn as () => void, at: now + ms };
        pending.push(handle);
        return handle;
      },
      clearTimeout(handle) {
        const idx = pending.indexOf(handle as { fn: () => void; at: number });
        if (idx !== -1) pending.splice(idx, 1);
      },
    },
    advance(ms: number) {
      const end = now + ms;
      while (now < end) {
        now += Math.min(1000, end - now);
        for (let i = pending.length - 1; i >= 0; i--) {
          if (pending[i].at <= now) {
            const { fn } = pending.splice(i, 1)[0];
            fn();
          }
        }
      }
    },
  };
}

describe('Orders', () => {
  it('assignNext returns null when empty', () => {
    const queue = new Orders();
    assert.equal(queue.assignNext(), null);
    assert.equal(queue.size, 0);
  });

  it('assignNext returns VIP before Normal', () => {
    const queue = new Orders();
    queue.add(makeOrder(1, 'normal'));
    queue.add(makeOrder(2, 'vip'));
    assert.equal(queue.assignNext()!.type, 'vip');
  });

  it('preserves insertion order', () => {
    const queue = new Orders();
    queue.add(makeOrder(1, 'vip'));
    queue.add(makeOrder(2, 'vip'));
    queue.add(makeOrder(3, 'vip'));
    assert.deepEqual(queue.vipOrders.map(o => o.id), [1, 2, 3]);
  });

  it('released order remains in queue at correct position', () => {
    const queue = new Orders();
    queue.add(makeOrder(1, 'vip'));
    queue.add(makeOrder(2, 'vip'));
    queue.add(makeOrder(3, 'vip'));
    const o2 = queue.assignNext()!;
    o2.status = 'PROCESSING';
    o2.status = 'PENDING'; // simulate release
    assert.deepEqual(queue.vipOrders.map(o => o.id), [1, 2, 3]);
  });

  it('getAll returns VIP orders first', () => {
    const queue = new Orders();
    queue.add(makeOrder(1, 'normal'));
    queue.add(makeOrder(2, 'vip'));
    queue.add(makeOrder(3, 'normal'));
    assert.deepEqual(queue.getAll().map(o => o.id), [2, 1, 3]);
  });
});

describe('OrderController', () => {
  let fc: ReturnType<typeof fakeClock>;
  let ctrl: OrderController;

  beforeEach(() => {
    fc = fakeClock();
    ctrl = new OrderController(fc.clock);
  });

  it('creates orders with unique increasing IDs', () => {
    const o1 = ctrl.addOrder('normal');
    const o2 = ctrl.addOrder('vip');
    const o3 = ctrl.addOrder('normal');
    assert.ok(o1.id < o2.id);
    assert.ok(o2.id < o3.id);
    ctrl.destroy();
  });

  it('VIP orders placed before Normal in pending list', () => {
    ctrl.addOrder('normal');
    ctrl.addOrder('normal');
    ctrl.addOrder('vip');
    assert.deepEqual(ctrl.pendingOrders.map(o => o.type), ['vip', 'normal', 'normal']);
    ctrl.destroy();
  });

  it('bot picks up highest priority pending order', () => {
    ctrl.addOrder('normal');
    ctrl.addOrder('vip');
    const bot = ctrl.addBot();
    assert.equal(bot.currentOrder!.type, 'vip');
    ctrl.destroy();
  });

  it('bot becomes IDLE when no pending orders', () => {
    const bot = ctrl.addBot();
    assert.equal(bot.status, 'IDLE');
    ctrl.destroy();
  });

  it('order completes after 10 seconds', () => {
    const completed: number[] = [];
    ctrl.onOrderCompleted((order) => completed.push(order.id));
    ctrl.addOrder('normal');
    ctrl.addBot();

    fc.advance(9999);
    assert.deepEqual(completed, []);
    fc.advance(1);
    assert.deepEqual(completed, [1001]);
    ctrl.destroy();
  });

  it('bot processes next order after completion', () => {
    ctrl.addOrder('normal');
    ctrl.addOrder('vip');
    const bot = ctrl.addBot();
    assert.equal(bot.currentOrder!.id, 1002); // VIP first

    fc.advance(10000);
    assert.equal(bot.currentOrder!.id, 1001);
    ctrl.destroy();
  });

  it('removeNewestBot destroys newest bot (LIFO)', () => {
    ctrl.addOrder('normal');
    ctrl.addOrder('normal');
    ctrl.addBot();
    const bot2 = ctrl.addBot();
    const removed = ctrl.removeNewestBot()!;
    assert.equal(removed.id, bot2.id);
    assert.equal(ctrl.botList.length, 1);
    ctrl.destroy();
  });

  it('removeNewestBot returns null when no bots', () => {
    assert.equal(ctrl.removeNewestBot(), null);
    ctrl.destroy();
  });

  it('removeBot by id removes specific bot', () => {
    ctrl.addOrder('normal');
    const bot1 = ctrl.addBot();
    const bot2 = ctrl.addBot();
    const removed = ctrl.removeBot(bot1.id)!;
    assert.equal(removed.id, bot1.id);
    assert.equal(ctrl.botList.length, 1);
    assert.equal(ctrl.botList[0].id, bot2.id);
    ctrl.destroy();
  });

  it('removeBot by id returns null for unknown id', () => {
    ctrl.addBot();
    assert.equal(ctrl.removeBot(999), null);
    ctrl.destroy();
  });

  it('removeNewestBot while processing returns order to original position', () => {
    ctrl.addOrder('normal');  // id=1001
    ctrl.addOrder('vip');     // id=1002
    ctrl.addOrder('normal');  // id=1003
    ctrl.addBot();            // picks VIP order#1002
    ctrl.addBot();            // picks Normal order#1001
    ctrl.removeNewestBot();         // removes bot2, order#1001 returns
    const pending = ctrl.pendingOrders;
    assert.deepEqual(pending.map(o => o.id), [1001, 1003]);
    assert.equal(pending[0].status, 'PENDING');
    ctrl.destroy();
  });

  it('idle bot picks up new order', () => {
    const bot = ctrl.addBot();
    assert.equal(bot.status, 'IDLE');
    ctrl.addOrder('normal');
    assert.equal(bot.status, 'ACTIVE');
    assert.equal(bot.currentOrder!.id, 1001);
    ctrl.destroy();
  });

  it('multiple bots process orders in parallel', () => {
    const completed: number[] = [];
    ctrl.onOrderCompleted((order) => completed.push(order.id));
    ctrl.addOrder('normal');
    ctrl.addOrder('normal');
    ctrl.addBot();
    ctrl.addBot();

    fc.advance(10000);
    assert.equal(completed.length, 2);
    ctrl.destroy();
  });

  it('returned order maintains priority among new orders', () => {
    ctrl.addOrder('normal');   // id=1001
    ctrl.addOrder('normal');   // id=1002
    ctrl.addBot();             // picks order#1001
    ctrl.removeNewestBot();          // order#1001 returns
    ctrl.addOrder('vip');      // id=1003
    const bot2 = ctrl.addBot();
    assert.equal(bot2.currentOrder!.id, 1003); // VIP first
    ctrl.destroy();
  });

  it('returned VIP order still precedes normal orders', () => {
    ctrl.addOrder('normal');   // id=1001
    ctrl.addOrder('vip');      // id=1002
    ctrl.addOrder('normal');   // id=1003
    const bot1 = ctrl.addBot(); // picks VIP 1002
    ctrl.addBot();              // picks normal 1001
    ctrl.removeNewestBot();           // bot2 removed, normal 1001 returns
    const pending = ctrl.pendingOrders;
    assert.equal(pending[0].id, 1001); // returned normal still before 1003
    assert.equal(pending[1].id, 1003);
    ctrl.destroy();
  });

  it('completedOrderList contains finished orders', () => {
    ctrl.addOrder('normal');
    ctrl.addOrder('vip');
    ctrl.addBot();
    ctrl.addBot();
    fc.advance(10000);
    assert.equal(ctrl.completedOrderList.length, 2);
    assert.equal(ctrl.completedOrderList[0].status, 'COMPLETE');
    assert.equal(ctrl.completedOrderList[1].status, 'COMPLETE');
    ctrl.destroy();
  });

  it('order status transitions PENDING -> PROCESSING -> COMPLETE', () => {
    const order = ctrl.addOrder('normal');
    assert.equal(order.status, 'PENDING');
    ctrl.addBot();
    assert.equal(order.status, 'PROCESSING');
    fc.advance(10000);
    assert.equal(order.status, 'COMPLETE');
    ctrl.destroy();
  });

  it('returned order gets processed and completes', () => {
    ctrl.addOrder('normal');   // id=1001
    ctrl.addOrder('normal');   // id=1002
    ctrl.addBot();              // picks 1001
    ctrl.addBot();              // picks 1002
    ctrl.removeNewestBot();           // 1002 returns
    fc.advance(10000);          // bot1 completes 1001
    assert.equal(ctrl.completedOrderList.length, 1);
    fc.advance(10000);          // bot1 picks and completes 1002
    assert.equal(ctrl.completedOrderList.length, 2);
    ctrl.destroy();
  });

  it('destroy prevents pending timers from firing', () => {
    const completed: number[] = [];
    ctrl.onOrderCompleted((order) => completed.push(order.id));
    ctrl.addOrder('normal');
    ctrl.addBot();
    ctrl.destroy();
    fc.advance(20000);
    assert.equal(completed.length, 0);
  });
});

describe('fuzz', () => {
  it('100000 random operations maintain invariants', () => {
    const fc = fakeClock();
    const ctrl = new OrderController(fc.clock);
    const totalCreated = { count: 0 };

    for (let i = 0; i < 100_000; i++) {
      const r = Math.random();
      if (r < 0.35) { ctrl.addOrder('normal'); totalCreated.count++; }
      else if (r < 0.50) { ctrl.addOrder('vip'); totalCreated.count++; }
      else if (r < 0.65) { ctrl.addBot(); }
      else if (r < 0.75 && ctrl.botList.length > 0) { ctrl.removeNewestBot(); }
      else { fc.advance(Math.floor(Math.random() * 15000)); }
    }

    fc.advance(60000);

    const pending = ctrl.pendingOrders;
    const completed = ctrl.completedOrderList;
    const bots = ctrl.botList;
    const activeBots = bots.filter(b => b.status === 'ACTIVE');
    const idleBots = bots.filter(b => b.status === 'IDLE');
    const processingCount = activeBots.length;

    // total = pending + processing + completed
    assert.equal(pending.length + processingCount + completed.length, totalCreated.count);

    // completed orders have no duplicates
    const completedIds = new Set(completed.map(o => o.id));
    assert.equal(completedIds.size, completed.length);

    // all completed orders are COMPLETE
    for (const o of completed) assert.equal(o.status, 'COMPLETE');

    // all pending orders are PENDING
    for (const o of pending) assert.equal(o.status, 'PENDING');

    // active bots have PROCESSING orders
    for (const b of activeBots) {
      assert.ok(b.currentOrder);
      assert.equal(b.currentOrder.status, 'PROCESSING');
    }

    // idle bots have no order
    for (const b of idleBots) {
      assert.equal(b.currentOrder, null);
    }

    // VIP orders come before normal in pending
    const vipPending = pending.filter(o => o.type === 'vip');
    const normalPending = pending.filter(o => o.type === 'normal');
    if (vipPending.length > 0 && normalPending.length > 0) {
      const lastVipIdx = pending.lastIndexOf(vipPending[vipPending.length - 1]);
      const firstNormalIdx = pending.indexOf(normalPending[0]);
      assert.ok(lastVipIdx < firstNormalIdx);
    }

    ctrl.destroy();
  });
});
