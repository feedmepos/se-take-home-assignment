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
