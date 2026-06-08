import { describe, it, expect } from 'vitest';
import { OrderQueue } from '../src/services/OrderQueue';
import { Order } from '../src/models/Order';
import { OrderType } from '../src/types';

const normal = (id: number) => new Order(id, OrderType.NORMAL, 0);
const vip = (id: number) => new Order(id, OrderType.VIP, 0);

describe('OrderQueue', () => {
  it('dequeues a single normal order', () => {
    const q = new OrderQueue();
    const o = normal(1);
    q.enqueue(o);
    expect(q.dequeue()).toBe(o);
  });

  it('returns null when empty', () => {
    expect(new OrderQueue().dequeue()).toBeNull();
  });

  it('tracks size', () => {
    const q = new OrderQueue();
    expect(q.size).toBe(0);
    q.enqueue(normal(1));
    q.enqueue(vip(2));
    expect(q.size).toBe(2);
  });

  it('dequeues VIP before normal even when normal enqueued first', () => {
    const q = new OrderQueue();
    const n = normal(1);
    const v = vip(2);
    q.enqueue(n);
    q.enqueue(v);
    expect(q.dequeue()).toBe(v);
    expect(q.dequeue()).toBe(n);
  });

  it('preserves FIFO within the VIP segment', () => {
    const q = new OrderQueue();
    const v1 = vip(1);
    const v2 = vip(2);
    q.enqueue(v1);
    q.enqueue(v2);
    expect(q.dequeue()).toBe(v1);
    expect(q.dequeue()).toBe(v2);
  });

  it('requeues a normal order to the head of the normal segment', () => {
    const q = new OrderQueue();
    const n1 = normal(1);
    const n2 = normal(2);
    q.enqueue(n1);
    q.enqueue(n2);
    q.dequeue(); // takes n1
    q.requeue(n1); // n1 goes back ahead of n2
    expect(q.dequeue()).toBe(n1);
    expect(q.dequeue()).toBe(n2);
  });

  it('requeued VIP still outranks normal orders', () => {
    const q = new OrderQueue();
    const v = vip(1);
    const n = normal(2);
    q.enqueue(v);
    q.enqueue(n);
    q.dequeue(); // takes v
    q.requeue(v);
    expect(q.dequeue()).toBe(v);
  });

  it('snapshot lists VIP segment before normal segment', () => {
    const q = new OrderQueue();
    const n = normal(1);
    const v = vip(2);
    q.enqueue(n);
    q.enqueue(v);
    expect(q.snapshot().map((o) => o.id)).toEqual([2, 1]);
  });
});
