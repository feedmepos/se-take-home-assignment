import { describe, it, expect } from 'vitest';
import { formatClockTime } from '../src/time';

describe('formatClockTime', () => {
  it('formats as zero-padded HH:MM:SS', () => {
    const result = formatClockTime(Date.now());
    expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it('reflects the given wall-clock instant', () => {
    const d = new Date(2026, 5, 1, 9, 5, 3);
    expect(formatClockTime(d.getTime())).toBe('09:05:03');
  });
});
