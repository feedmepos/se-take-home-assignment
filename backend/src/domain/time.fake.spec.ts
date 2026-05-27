import { FakeClock } from './time.fake';

test('fires a scheduled callback only after enough time advances', () => {
  const clock = new FakeClock(new Date('2025-01-01T00:00:00Z'));
  let fired = false;
  clock.schedule(10_000, () => { fired = true; });
  clock.advance(9_999);
  expect(fired).toBe(false);
  clock.advance(1);
  expect(fired).toBe(true);
});

test('cancel prevents the callback', () => {
  const clock = new FakeClock(new Date('2025-01-01T00:00:00Z'));
  let fired = false;
  const cancel = clock.schedule(1_000, () => { fired = true; });
  cancel();
  clock.advance(2_000);
  expect(fired).toBe(false);
});

test('advance fires multiple due timers in one call, in chronological order', () => {
  const clock = new FakeClock(new Date('2025-01-01T00:00:00Z'));
  const order: string[] = [];
  clock.schedule(5_000, () => { order.push('a'); });
  clock.schedule(1_000, () => { order.push('b'); });
  clock.advance(6_000);
  expect(order).toEqual(['b', 'a']);
});
