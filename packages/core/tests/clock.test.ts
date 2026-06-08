import { describe, it, expect, vi } from 'vitest';
import { FakeClock } from '../src/clock/FakeClock';

describe('FakeClock', () => {
  it('starts at time 0', () => {
    const clock = new FakeClock();
    expect(clock.now()).toBe(0);
  });

  it('advances current time', () => {
    const clock = new FakeClock();
    clock.advance(5000);
    expect(clock.now()).toBe(5000);
  });

  it('does not fire a timer before its due time', () => {
    const clock = new FakeClock();
    const fn = vi.fn();
    clock.setTimeout(fn, 10_000);
    clock.advance(9999);
    expect(fn).not.toHaveBeenCalled();
  });

  it('fires a timer once its due time is reached', () => {
    const clock = new FakeClock();
    const fn = vi.fn();
    clock.setTimeout(fn, 10_000);
    clock.advance(10_000);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not fire a cancelled timer', () => {
    const clock = new FakeClock();
    const fn = vi.fn();
    const cancel = clock.setTimeout(fn, 10_000);
    cancel();
    clock.advance(10_000);
    expect(fn).not.toHaveBeenCalled();
  });

  it('fires multiple timers in chronological order', () => {
    const clock = new FakeClock();
    const calls: string[] = [];
    clock.setTimeout(() => calls.push('b'), 2000);
    clock.setTimeout(() => calls.push('a'), 1000);
    clock.advance(2000);
    expect(calls).toEqual(['a', 'b']);
  });

  it('fires timers scheduled during an advance within the same advance window', () => {
    const clock = new FakeClock();
    const calls: string[] = [];
    clock.setTimeout(() => {
      calls.push('first');
      clock.setTimeout(() => calls.push('second'), 1000);
    }, 1000);
    clock.advance(2000);
    expect(calls).toEqual(['first', 'second']);
  });
});
