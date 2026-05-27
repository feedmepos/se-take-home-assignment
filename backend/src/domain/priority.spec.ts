import { compareOrders } from './priority';
import { Order } from './types';

const o = (id: number, type: 'NORMAL' | 'VIP'): Order =>
  ({ id, type, status: 'PENDING', createdAt: new Date() });

test('VIP ranks before NORMAL', () => {
  expect(compareOrders(o(5, 'VIP'), o(1, 'NORMAL'))).toBeLessThan(0);
});
test('within a tier, lower id ranks first (FIFO + requeue restoration)', () => {
  expect(compareOrders(o(2, 'VIP'), o(9, 'VIP'))).toBeLessThan(0);
  expect(compareOrders(o(9, 'NORMAL'), o(3, 'NORMAL'))).toBeGreaterThan(0);
});
test('a requeued low-id VIP sorts ahead of a later VIP', () => {
  const list = [o(9, 'VIP'), o(2, 'VIP'), o(1, 'NORMAL')].sort(compareOrders);
  expect(list.map((x) => x.id)).toEqual([2, 9, 1]);
});
