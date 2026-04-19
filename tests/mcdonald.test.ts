import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Order, Manager } from '../src/mcdonald.js';
import type { Clock, ManagerEvent } from '../src/mcdonald.js';

function fakeClock(): { clock: Clock; advance(ms: number): void } {
  const pending: { fn: () => void; at: number }[] = [];
  let now = 0;

  return {
    clock: {
      setTimeout(fn, ms) {
        const handle = { fn: fn as () => void, at: now + (ms as number) };
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
      while (pending.length > 0 && now < end) {
        now = end;
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

describe('Order', () => {
  it('starts as PENDING', () => {
    const o = new Order(1, 'normal');
    assert.equal(o.status, 'PENDING');
    assert.equal(o.id, 1);
    assert.equal(o.type, 'normal');
  });

  it('transitions PENDING -> PROCESSING -> COMPLETE', () => {
    const o = new Order(1, 'vip');
    o.start();
    assert.equal(o.status, 'PROCESSING');
    o.complete();
    assert.equal(o.status, 'COMPLETE');
  });

  it('cancel reverts to PENDING', () => {
    const o = new Order(1, 'normal');
    o.start();
    assert.equal(o.status, 'PROCESSING');
    o.cancel();
    assert.equal(o.status, 'PENDING');
  });

  it('toSnapshot returns correct snapshot', () => {
    const o = new Order(5, 'vip');
    o.start();
    assert.deepEqual(o.toSnapshot(), { id: 5, type: 'vip', status: 'PROCESSING' });
  });
});

describe('Manager', () => {
  let fc: ReturnType<typeof fakeClock>;
  let mgr: Manager;
  let events: ManagerEvent[];

  beforeEach(() => {
    fc = fakeClock();
    mgr = new Manager();
    events = [];
    mgr.onEvent = (e) => events.push(e);
  });

  it('placeOrder creates a normal order', () => {
    mgr.placeOrder();
    assert.equal(events[0].type, 'order_created');
    assert.equal(events[0].order.type, 'normal');
    assert.equal(events[0].order.status, 'PENDING');
    assert.equal(mgr.state.pendingCount, 1);
    assert.equal(mgr.state.normalTotal, 1);
  });

  it('placeVipOrder creates a VIP order', () => {
    mgr.placeVipOrder();
    assert.equal(events[0].type, 'order_created');
    assert.equal(events[0].order.type, 'vip');
    assert.equal(mgr.state.vipTotal, 1);
  });

  it('orders get unique increasing IDs', () => {
    mgr.placeOrder();
    mgr.placeVipOrder();
    mgr.placeOrder();
    const ids = events.filter(e => e.type === 'order_created').map(e => e.order.id);
    assert.ok(ids[0] < ids[1]);
    assert.ok(ids[1] < ids[2]);
  });

  it('addBot emits bot_created event', () => {
    mgr.addBot(fc.clock);
    assert.equal(events[0].type, 'bot_created');
    assert.equal(events[0].botId, 1);
    assert.equal(events[0].status, 'IDLE');
    assert.equal(mgr.state.activeBots, 1);
  });

  it('bot picks up pending order immediately', () => {
    mgr.placeOrder();
    mgr.addBot(fc.clock);
    const picked = events.find(e => e.type === 'bot_picked_up');
    assert.ok(picked);
    assert.equal(picked!.order.id, events[0].order.id);
    assert.equal(mgr.state.pendingCount, 0);
  });

  it('VIP order jumps ahead of normal in queue', () => {
    mgr.placeOrder();  // normal, id=1
    mgr.placeOrder();  // normal, id=2
    mgr.placeVipOrder(); // vip, id=3
    assert.deepEqual(mgr.state.pending.map(o => o.type), ['vip', 'normal', 'normal']);
  });

  it('bot processes VIP before normal', () => {
    mgr.placeOrder();
    mgr.placeVipOrder();
    mgr.addBot(fc.clock);
    const picked = events.find(e => e.type === 'bot_picked_up');
    assert.equal(picked!.order.type, 'vip');
  });

  it('order completes after 10 seconds', () => {
    mgr.placeOrder();
    mgr.addBot(fc.clock);

    fc.advance(9999);
    assert.equal(events.find(e => e.type === 'bot_completed'), undefined);

    fc.advance(1);
    const completed = events.find(e => e.type === 'bot_completed');
    assert.ok(completed);
    assert.equal(completed!.order.status, 'COMPLETE');
    assert.equal(mgr.state.completedCount, 1);
  });

  it('bot picks next order after completion', () => {
    mgr.placeOrder();
    mgr.placeVipOrder();
    mgr.addBot(fc.clock);

    const firstPick = events.find(e => e.type === 'bot_picked_up')!;
    assert.equal(firstPick.order.type, 'vip');

    fc.advance(10000);
    const picks = events.filter(e => e.type === 'bot_picked_up');
    assert.equal(picks.length, 2);
    assert.equal(picks[1].order.type, 'normal');
  });

  it('removeNewestBot destroys newest bot (LIFO)', () => {
    mgr.addBot(fc.clock);
    mgr.addBot(fc.clock);
    mgr.removeNewestBot();

    const destroyed = events.filter(e => e.type === 'bot_destroyed');
    assert.equal(destroyed.length, 1);
    assert.equal(destroyed[0].botId, 2);
    assert.equal(mgr.state.activeBots, 1);
  });

  it('removeNewestBot returns order to pending', () => {
    mgr.placeOrder();
    mgr.placeOrder();
    mgr.addBot(fc.clock);
    mgr.addBot(fc.clock);
    mgr.removeNewestBot();

    assert.equal(mgr.state.pendingCount, 1);
    assert.equal(mgr.state.pending[0].status, 'PENDING');
  });

  it('returned order maintains VIP priority', () => {
    mgr.placeOrder();   // normal id=1
    mgr.placeVipOrder(); // vip id=2
    mgr.placeOrder();   // normal id=3
    mgr.addBot(fc.clock); // picks VIP #2
    mgr.addBot(fc.clock); // picks normal #1
    mgr.removeNewestBot(); // returns normal #1

    const pending = mgr.state.pending;
    // normal #1 should be before normal #3, no VIP in pending
    assert.deepEqual(pending.map(o => o.id), [1000, 1002]);
  });

  it('clearBots removes all bots', () => {
    mgr.addBot(fc.clock);
    mgr.addBot(fc.clock);
    mgr.addBot(fc.clock);
    mgr.clearBots();

    assert.equal(mgr.state.activeBots, 0);
    const destroyed = events.filter(e => e.type === 'bot_destroyed');
    assert.equal(destroyed.length, 3);
  });

  it('clearBots returns all in-progress orders to pending', () => {
    mgr.placeOrder();
    mgr.placeOrder();
    mgr.addBot(fc.clock);
    mgr.addBot(fc.clock);
    mgr.clearBots();

    assert.equal(mgr.state.pendingCount, 2);
    for (const o of mgr.state.pending) {
      assert.equal(o.status, 'PENDING');
    }
  });

  it('idle bot picks up newly placed order', () => {
    mgr.addBot(fc.clock);
    assert.equal(mgr.state.activeBots, 1);
    assert.equal(mgr.state.pendingCount, 0);

    mgr.placeOrder();
    assert.equal(mgr.state.pendingCount, 0); // picked immediately
    const picked = events.find(e => e.type === 'bot_picked_up');
    assert.ok(picked);
  });

  it('multiple bots process orders in parallel', () => {
    mgr.placeOrder();
    mgr.placeOrder();
    mgr.addBot(fc.clock);
    mgr.addBot(fc.clock);

    fc.advance(10000);
    const completed = events.filter(e => e.type === 'bot_completed');
    assert.equal(completed.length, 2);
  });

  it('emits bot_idle when bot has nothing to process', () => {
    mgr.placeOrder();
    mgr.addBot(fc.clock);

    fc.advance(10000);
    const idle = events.filter(e => e.type === 'bot_idle');
    assert.equal(idle.length, 1);
  });

  it('no bot_idle when pending orders remain after completion', () => {
    mgr.placeOrder();
    mgr.placeOrder();
    mgr.addBot(fc.clock); // picks first order

    fc.advance(10000); // completes, picks second
    const idle = events.filter(e => e.type === 'bot_idle');
    assert.equal(idle.length, 0);
  });

  it('state reflects correct counts', () => {
    mgr.placeOrder();   // normal
    mgr.placeVipOrder(); // vip
    mgr.placeOrder();   // normal
    mgr.addBot(fc.clock);

    const s = mgr.state;
    assert.equal(s.pendingCount, 2);
    assert.equal(s.totalProcessed, 3);
    assert.equal(s.vipTotal, 1);
    assert.equal(s.normalTotal, 2);
    assert.equal(s.completedCount, 0);
    assert.equal(s.activeBots, 1);
  });

  it('removeNewestBot with no bots is a no-op', () => {
    mgr.removeNewestBot();
    assert.equal(events.length, 0);
  });
});

describe('fuzz', () => {
  it('100000 random operations maintain invariants', () => {
    const fc = fakeClock();
    const mgr = new Manager();
    const events: ManagerEvent[] = [];
    mgr.onEvent = (e) => events.push(e);
    let totalOrders = 0;

    for (let i = 0; i < 100_000; i++) {
      const r = Math.random();
      if (r < 0.35) { mgr.placeOrder(); totalOrders++; }
      else if (r < 0.50) { mgr.placeVipOrder(); totalOrders++; }
      else if (r < 0.65) { mgr.addBot(fc.clock); }
      else if (r < 0.75) { mgr.removeNewestBot(); }
      else { fc.advance(Math.floor(Math.random() * 15000)); }
    }

    fc.advance(60000);

    const s = mgr.state;
    assert.equal(s.pendingCount + s.processing.length + s.completedCount, totalOrders);

    const completedIds = new Set(s.completed.map(o => o.id));
    assert.equal(completedIds.size, s.completed.length);

    for (const o of s.completed) assert.equal(o.status, 'COMPLETE');
    for (const o of s.pending) assert.equal(o.status, 'PENDING');
    for (const o of s.processing) assert.equal(o.status, 'PROCESSING');

    // VIP before normal in pending
    const vipPending = s.pending.filter(o => o.type === 'vip');
    const normalPending = s.pending.filter(o => o.type === 'normal');
    if (vipPending.length > 0 && normalPending.length > 0) {
      const lastVipIdx = s.pending.lastIndexOf(vipPending[vipPending.length - 1]);
      const firstNormalIdx = s.pending.indexOf(normalPending[0]);
      assert.ok(lastVipIdx < firstNormalIdx);
    }
  });
});
