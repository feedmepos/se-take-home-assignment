import { describe, expect, it } from 'vitest';
import type { PendingOrder } from './types';
import { compareOrders, insertOrder, pickNext } from './queue';

// Helper to build a minimal PendingOrder for testing
function make(id: number, type: PendingOrder['type']): PendingOrder {
  return { id, type, status: 'PENDING', createdAt: 0 };
}

describe('compareOrders', () => {
  it('sorts VIP before NORMAL', () => {
    const vip = make(2, 'VIP');
    const normal = make(1, 'NORMAL');
    expect(compareOrders(vip, normal)).toBeLessThan(0);
    expect(compareOrders(normal, vip)).toBeGreaterThan(0);
  });

  it('sorts ascending by id within the same type', () => {
    expect(compareOrders(make(1, 'VIP'), make(2, 'VIP'))).toBeLessThan(0);
    expect(compareOrders(make(3, 'NORMAL'), make(1, 'NORMAL'))).toBeGreaterThan(0);
  });

  it('returns 0 for same type and same id', () => {
    expect(compareOrders(make(5, 'VIP'), make(5, 'VIP'))).toBe(0);
  });
});

describe('insertOrder', () => {
  it('appends a Normal to the back of an empty queue', () => {
    const q = insertOrder([], make(1, 'NORMAL'));
    expect(q).toHaveLength(1);
    expect(q[0]?.id).toBe(1);
  });

  it('new Normal appends behind existing Normals', () => {
    const q0 = insertOrder([], make(1, 'NORMAL'));
    const q1 = insertOrder(q0, make(2, 'NORMAL'));
    expect(q1.map((o) => o.id)).toEqual([1, 2]);
  });

  it('new VIP goes ahead of all Normals', () => {
    const q0 = insertOrder([], make(1, 'NORMAL'));
    const q1 = insertOrder(q0, make(2, 'NORMAL'));
    const q2 = insertOrder(q1, make(3, 'VIP'));
    expect(q2[0]?.id).toBe(3); // VIP leads
    expect(q2[1]?.id).toBe(1); // Normals follow in id order
    expect(q2[2]?.id).toBe(2);
  });

  it('new VIP goes behind existing VIPs', () => {
    const q0 = insertOrder([], make(1, 'VIP'));
    const q1 = insertOrder(q0, make(3, 'NORMAL'));
    const q2 = insertOrder(q1, make(5, 'VIP'));
    expect(q2.map((o) => [o.id, o.type])).toEqual([
      [1, 'VIP'],
      [5, 'VIP'],
      [3, 'NORMAL'],
    ]);
  });

  it('re-inserting a cancelled order restores its original position', () => {
    // Order 2 (NORMAL) is between order 1 (VIP) and order 3 (NORMAL)
    const q = insertOrder(
      insertOrder(insertOrder([], make(1, 'VIP')), make(3, 'NORMAL')),
      make(2, 'NORMAL')
    );
    expect(q.map((o) => o.id)).toEqual([1, 2, 3]);
  });

  it('does not mutate the input queue', () => {
    const original: PendingOrder[] = [make(1, 'NORMAL')];
    const result = insertOrder(original, make(2, 'NORMAL'));
    expect(original).toHaveLength(1); // untouched
    expect(result).toHaveLength(2);
  });
});

describe('pickNext', () => {
  it('returns null for an empty queue', () => {
    expect(pickNext([])).toBeNull();
  });

  it('returns the front order and the rest', () => {
    const q: PendingOrder[] = [make(1, 'VIP'), make(2, 'NORMAL')];
    const result = pickNext(q);
    expect(result).not.toBeNull();
    expect(result?.next.id).toBe(1);
    expect(result?.rest).toHaveLength(1);
    expect(result?.rest[0]?.id).toBe(2);
  });
});
