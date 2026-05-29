import { describe, it, expect } from 'vitest';
import { PriorityQueue } from './PriorityQueue.js';
import { createOrder } from './Order.js';

describe('PriorityQueue', () => {
  it('should enqueue and dequeue orders in FIFO order for same type', () => {
    const queue = new PriorityQueue();
    const order1 = createOrder('normal');
    const order2 = createOrder('normal');
    const order3 = createOrder('normal');

    queue.enqueue(order1);
    queue.enqueue(order2);
    queue.enqueue(order3);

    expect(queue.dequeue()).toBe(order1);
    expect(queue.dequeue()).toBe(order2);
    expect(queue.dequeue()).toBe(order3);
  });

  it('should prioritize VIP orders over normal orders', () => {
    const queue = new PriorityQueue();
    const normalOrder = createOrder('normal');
    
    // 稍微延迟确保时间戳不同
    setTimeout(() => {}, 1);
    
    const vipOrder = createOrder('vip');

    queue.enqueue(normalOrder);
    queue.enqueue(vipOrder);

    // VIP 订单应该先出队
    expect(queue.dequeue()?.type).toBe('vip');
    expect(queue.dequeue()?.type).toBe('normal');
  });

  it('should maintain FIFO order within VIP orders', () => {
    const queue = new PriorityQueue();
    const vipOrder1 = createOrder('vip');
    
    setTimeout(() => {}, 1);
    
    const vipOrder2 = createOrder('vip');

    queue.enqueue(vipOrder1);
    queue.enqueue(vipOrder2);

    expect(queue.dequeue()).toBe(vipOrder1);
    expect(queue.dequeue()).toBe(vipOrder2);
  });

  it('should correctly order mixed VIP and normal orders', () => {
    const queue = new PriorityQueue();
    const normal1 = createOrder('normal');
    const vip1 = createOrder('vip');
    const normal2 = createOrder('normal');
    const vip2 = createOrder('vip');

    queue.enqueue(normal1);
    queue.enqueue(vip1);
    queue.enqueue(normal2);
    queue.enqueue(vip2);

    const orders = queue.getAll();
    const types = orders.map(o => o.type);
    
    // 所有 VIP 订单应该在前面，然后是普通订单
    expect(types).toEqual(['vip', 'vip', 'normal', 'normal']);
  });

  it('should return undefined when dequeuing from empty queue', () => {
    const queue = new PriorityQueue();
    expect(queue.dequeue()).toBeUndefined();
  });

  it('should return correct size', () => {
    const queue = new PriorityQueue();
    expect(queue.size).toBe(0);

    queue.enqueue(createOrder('normal'));
    expect(queue.size).toBe(1);

    queue.enqueue(createOrder('vip'));
    expect(queue.size).toBe(2);

    queue.dequeue();
    expect(queue.size).toBe(1);
  });

  it('should filter VIP and normal orders correctly', () => {
    const queue = new PriorityQueue();
    const normal1 = createOrder('normal');
    const vip1 = createOrder('vip');
    const normal2 = createOrder('normal');
    const vip2 = createOrder('vip');

    queue.enqueue(normal1);
    queue.enqueue(vip1);
    queue.enqueue(normal2);
    queue.enqueue(vip2);

    expect(queue.getVipOrders()).toHaveLength(2);
    expect(queue.getNormalOrders()).toHaveLength(2);
    expect(queue.getVipOrders()[0]).toBe(vip1);
    expect(queue.getNormalOrders()[0]).toBe(normal1);
  });

  it('should reinsert order maintaining priority', () => {
    const queue = new PriorityQueue();
    const normal1 = createOrder('normal');
    const vip1 = createOrder('vip');
    const normal2 = createOrder('normal');

    queue.enqueue(normal1);
    queue.enqueue(vip1);
    queue.enqueue(normal2);

    // 取出第一个订单（VIP）
    const removed = queue.dequeue();
    
    // 重新插入
    if (removed) {
      queue.reinsert(removed);
    }

    const orders = queue.getAll();
    // VIP 订单应该仍然在普通订单前面
    expect(orders[0].type).toBe('vip');
    expect(orders[1].type).toBe('normal');
    expect(orders[2].type).toBe('normal');
  });
});