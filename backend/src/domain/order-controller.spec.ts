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
