import { OrderController, DEFAULT_COOK_MS } from './order-controller';
import { FakeClock } from './time.fake';
import { BotNotFoundError } from './errors';

const make = () => { const c = new FakeClock(); return { c, ctrl: new OrderController(c, c) }; };

test('new orders are PENDING with unique increasing ids', () => {
  const { ctrl } = make();
  const a = ctrl.addOrder('NORMAL');
  const b = ctrl.addOrder();            // defaults to NORMAL
  expect(a.id).toBe(1); expect(b.id).toBe(2);
  expect(a.status).toBe('PENDING');
});

test('VIP is queued ahead of NORMAL but behind an existing VIP', () => {
  const { ctrl } = make();
  ctrl.addOrder('NORMAL');     // #1
  ctrl.addOrder('VIP');        // #2
  ctrl.addOrder('VIP');        // #3
  ctrl.addOrder('NORMAL');     // #4
  expect(ctrl.snapshot().pending.map((o) => o.id)).toEqual([2, 3, 1, 4]);
});

test('a bot picks the highest-priority order and completes after 10s', () => {
  const c = new FakeClock(); const ctrl = new OrderController(c, c);
  ctrl.addOrder('NORMAL');   // #1
  ctrl.addOrder('VIP');      // #2
  ctrl.addBot();             // bot #1 -> should take VIP #2
  expect(ctrl.snapshot().processing).toEqual([{ order: expect.objectContaining({ id: 2 }), botId: 1 }]);
  c.advance(DEFAULT_COOK_MS);
  const snap = ctrl.snapshot();
  expect(snap.complete.map((o) => o.id)).toContain(2);
  // then it should pick #1
  expect(snap.processing[0]!.order.id).toBe(1);
});

test('bot goes IDLE when no pending orders', () => {
  const c = new FakeClock(); const ctrl = new OrderController(c, c);
  const bot = ctrl.addBot();
  expect(ctrl.snapshot().bots.find((b) => b.id === bot.id)!.status).toBe('IDLE');
});

test('two bots added when two orders pending take different orders', () => {
  const c = new FakeClock(); const ctrl = new OrderController(c, c);
  ctrl.addOrder('VIP');     // #1
  ctrl.addOrder('NORMAL');  // #2
  ctrl.addBot();            // #1
  ctrl.addBot();            // #2
  const ids = ctrl.snapshot().processing.map((p) => p.order.id).sort();
  expect(ids).toEqual([1, 2]);
});

test('del-bot (no id) removes the newest bot', () => {
  const c = new FakeClock(); const ctrl = new OrderController(c, c);
  ctrl.addBot(); ctrl.addBot();           // #1, #2
  const removed = ctrl.removeBot();
  expect(removed.id).toBe(2);
  expect(ctrl.listBots().map((b) => b.id)).toEqual([1]);
});

test('removing a PROCESSING bot requeues its order to its original slot', () => {
  const c = new FakeClock(); const ctrl = new OrderController(c, c);
  ctrl.addOrder('VIP');     // #1
  ctrl.addOrder('VIP');     // #2
  ctrl.addBot();            // #1 takes #1 (PROCESSING)
  ctrl.addOrder('VIP');     // #3 pending
  ctrl.removeBot(1);        // #1 requeued
  expect(ctrl.snapshot().pending.map((o) => o.id)).toEqual([1, 2, 3]); // #1 back at front
  expect(ctrl.snapshot().processing).toEqual([]);
});

test('removeBot with unknown id or none throws BotNotFoundError', () => {
  const c = new FakeClock(); const ctrl = new OrderController(c, c);
  expect(() => ctrl.removeBot()).toThrow(BotNotFoundError);
  ctrl.addBot();
  expect(() => ctrl.removeBot(99)).toThrow(BotNotFoundError);
});

test('emits OrderCreated, BotAdded, OrderStarted, OrderCompleted in order', () => {
  const c = new FakeClock(); const ctrl = new OrderController(c, c);
  const seen: string[] = [];
  ctrl.subscribe((e) => seen.push(e.type));
  ctrl.addOrder('NORMAL'); // OrderCreated
  ctrl.addBot();           // BotAdded, OrderStarted
  c.advance(10_000);       // OrderCompleted, then BotIdle (no pending)
  expect(seen).toEqual(['OrderCreated', 'BotAdded', 'OrderStarted', 'OrderCompleted', 'BotIdle']);
});

test('BotIdle is a transition, not emitted per tryAssign for already-idle bots', () => {
  const c = new FakeClock(); const ctrl = new OrderController(c, c);
  ctrl.addOrder('NORMAL');   // #1
  const events: { type: string; botId?: number }[] = [];
  ctrl.subscribe((e) => events.push(e as { type: string; botId?: number }));
  ctrl.addBot();             // bot #1 takes order #1 (PROCESSING) -> no BotIdle
  ctrl.addBot();             // bot #2 has no order -> exactly one BotIdle for bot #2
  const idleAfterBots = events.filter((e) => e.type === 'BotIdle');
  expect(idleAfterBots).toEqual([{ type: 'BotIdle', botId: 2, at: expect.any(Date) }]);

  // Completing order #1 frees bot #1. tryAssign must NOT re-emit BotIdle for the
  // already-idle bot #2; bot #1 becomes idle exactly once.
  c.advance(10_000);
  const allIdle = events.filter((e) => e.type === 'BotIdle');
  expect(allIdle).toEqual([
    { type: 'BotIdle', botId: 2, at: expect.any(Date) },
    { type: 'BotIdle', botId: 1, at: expect.any(Date) },
  ]);
});

test('startedAt is set when bot picks order, cleared when order is requeued', () => {
  const c = new FakeClock(); const ctrl = new OrderController(c, c);
  ctrl.addOrder('NORMAL');  // #1
  ctrl.addBot();            // bot #1 takes order #1
  expect(ctrl.snapshot().processing[0]!.order.startedAt).toBeInstanceOf(Date);
  ctrl.removeBot(1);        // order #1 requeued
  expect(ctrl.snapshot().pending[0]!.startedAt).toBeUndefined();
});

test('removeBot of a non-newest specific id requeues only its order, leaving others processing', () => {
  const c = new FakeClock(); const ctrl = new OrderController(c, c);
  ctrl.addOrder('VIP');     // #1
  ctrl.addOrder('VIP');     // #2
  ctrl.addBot();            // bot #1 takes order #1
  ctrl.addBot();            // bot #2 takes order #2
  ctrl.removeBot(1);        // remove non-newest bot #1

  const snap = ctrl.snapshot();
  expect(snap.pending.map((o) => o.id)).toContain(1);          // order #1 back to pending
  expect(snap.processing).toEqual([{ order: expect.objectContaining({ id: 2 }), botId: 2 }]); // bot #2 unaffected
  expect(ctrl.listBots().map((b) => b.id)).toEqual([2]);        // bot #1 gone
});
