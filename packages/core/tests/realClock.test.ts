import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RealClock } from '../src/clock/RealClock';

describe('RealClock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('now() returns the current wall-clock time', () => {
    vi.setSystemTime(new Date('2026-06-01T10:00:00Z'));
    const clock = new RealClock();
    expect(clock.now()).toBe(Date.now());
  });

  it('fires the scheduled callback after the delay elapses', () => {
    const clock = new RealClock();
    const fn = vi.fn();
    clock.setTimeout(fn, 10_000);

    vi.advanceTimersByTime(9_999);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('cancel handle prevents the callback from firing', () => {
    const clock = new RealClock();
    const fn = vi.fn();
    const cancel = clock.setTimeout(fn, 10_000);

    cancel();
    vi.advanceTimersByTime(10_000);
    expect(fn).not.toHaveBeenCalled();
  });
});
