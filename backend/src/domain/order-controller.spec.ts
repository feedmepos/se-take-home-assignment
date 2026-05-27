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
