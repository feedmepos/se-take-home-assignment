import { describe, expect, it } from 'vitest';
import { formatTime } from './format';

describe('formatTime', () => {
  it('formats epoch ms to HH:MM:SS (UTC)', () => {
    // 2024-01-01T12:00:00.000Z = 12:00:00 UTC
    const ts = new Date('2024-01-01T12:00:00.000Z').getTime();
    expect(formatTime(ts)).toBe('12:00:00');
  });

  it('pads single-digit hours, minutes, seconds', () => {
    // 2024-01-01T01:02:03.000Z
    const ts = new Date('2024-01-01T01:02:03.000Z').getTime();
    expect(formatTime(ts)).toBe('01:02:03');
  });

  it('handles midnight correctly', () => {
    const ts = new Date('2024-01-01T00:00:00.000Z').getTime();
    expect(formatTime(ts)).toBe('00:00:00');
  });
});
