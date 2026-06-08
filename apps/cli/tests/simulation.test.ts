import { describe, it, expect } from 'vitest';
import { runSimulation } from '../src/simulation';

describe('runSimulation', () => {
  const output = runSimulation();
  const lines = output.split('\n');

  it('contains timestamped lines in HH:MM:SS format', () => {
    expect(output).toMatch(/\[\d{2}:\d{2}:\d{2}\]/);
  });

  it('creates a VIP order ahead of a normal one (priority demonstrated)', () => {
    expect(output).toContain('Created Normal Order #1001');
    expect(output).toContain('Created VIP Order #1002');
    // VIP #1002 is picked up before normal #1001 despite being created later
    const pickVip = lines.findIndex((l) => l.includes('picked up VIP Order #1002'));
    const pickNormal = lines.findIndex((l) => l.includes('picked up Normal Order #1001'));
    expect(pickVip).toBeGreaterThanOrEqual(0);
    expect(pickNormal).toBeGreaterThan(pickVip);
  });

  it('demonstrates removing a bot returns its order to the queue', () => {
    expect(output).toContain('returned to queue');
  });

  it('completes all four orders and ends with an empty queue', () => {
    expect(output).toContain('Orders Completed: 4');
    expect(output).toContain('Pending Orders: 0');
  });
});
