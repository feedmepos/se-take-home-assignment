import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Countdown } from './Countdown';

describe('Countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows remaining seconds: startedAt = now-3s, cookDurationMs=10000 → 7s', () => {
    const now = Date.now();
    const startedAt = new Date(now - 3000).toISOString();

    render(<Countdown startedAt={startedAt} cookDurationMs={10000} />);

    expect(screen.getByText('7s')).toBeDefined();
  });

  it('decrements by 1 after 1 second elapses', () => {
    const now = Date.now();
    const startedAt = new Date(now - 3000).toISOString();

    render(<Countdown startedAt={startedAt} cookDurationMs={10000} />);

    expect(screen.getByText('7s')).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText('6s')).toBeDefined();
  });

  it('decrements multiple steps correctly', () => {
    const now = Date.now();
    const startedAt = new Date(now - 3000).toISOString();

    render(<Countdown startedAt={startedAt} cookDurationMs={10000} />);

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.getByText('3s')).toBeDefined();
  });

  it('clamps at 0s and never shows negative', () => {
    const now = Date.now();
    // Started 9 seconds ago on a 10s cook — only 1s remaining
    const startedAt = new Date(now - 9000).toISOString();

    render(<Countdown startedAt={startedAt} cookDurationMs={10000} />);

    // advance past expiry
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText('0s')).toBeDefined();
  });

  it('shows 0s immediately when already expired', () => {
    const now = Date.now();
    // Already past expiry
    const startedAt = new Date(now - 15000).toISOString();

    render(<Countdown startedAt={startedAt} cookDurationMs={10000} />);

    expect(screen.getByText('0s')).toBeDefined();
  });

  it('clears the interval on unmount (no interval leak)', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const now = Date.now();
    const startedAt = new Date(now - 3000).toISOString();

    const { unmount } = render(<Countdown startedAt={startedAt} cookDurationMs={10000} />);

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
