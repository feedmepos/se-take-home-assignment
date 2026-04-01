import { describe, it, expect, beforeEach } from 'vitest';
import { OrderQueueService } from './order-queue.service.js';

describe('OrderQueueService', () => {
  let queue: OrderQueueService;

  beforeEach(() => {
    queue = new OrderQueueService();
  });

  describe('addOrder', () => {
    it('should add a normal order with incremented id and pending status', () => {
      const order = queue.addOrder('normal');
      expect(order).toEqual({ id: 1001, type: 'normal', status: 'pending' });
    });

    it('should add a vip order with incremented id', () => {
      const order1 = queue.addOrder('normal');
      const order2 = queue.addOrder('vip');
      expect(order1.id).toBe(1001);
      expect(order2).toEqual({ id: 1002, type: 'vip', status: 'pending' });
    });
  });

  describe('isEmpty', () => {
    it('should return true when no orders exist', () => {
      expect(queue.isEmpty()).toBe(true);
    });
    it('should return false when orders exist', () => {
      queue.addOrder('normal');
      expect(queue.isEmpty()).toBe(false);
    });
  });

  describe('nextOrder', () => {
    it('should dequeue vip orders before normal orders', () => {
      queue.addOrder('normal');
      queue.addOrder('vip');
      const next = queue.nextOrder();
      expect(next).toEqual({ id: 1002, type: 'vip', status: 'pending' });
      expect(queue.pending()).toEqual([
        { id: 1001, type: 'normal', status: 'pending' },
      ]);
    });
    it('should return null when queue is empty', () => {
      expect(queue.nextOrder()).toBeNull();
    });
    it('should dequeue normal orders when no vip orders exist', () => {
      queue.addOrder('normal');
      queue.addOrder('normal');
      const next = queue.nextOrder();
      expect(next).toEqual({ id: 1001, type: 'normal', status: 'pending' });
    });
  });

  describe('returnOrder', () => {
    it('should return a normal order sorted by id', () => {
      queue.addOrder('normal');
      queue.addOrder('normal');
      queue.addOrder('normal');
      const order = queue.nextOrder()!; // id: 1001
      queue.nextOrder(); // id: 1002 removed
      queue.returnOrder(order);
      const pending = queue.pending();
      expect(pending).toEqual([
        { id: 1001, type: 'normal', status: 'pending' },
        { id: 1003, type: 'normal', status: 'pending' },
      ]);
    });

    it('should return a vip order sorted by id', () => {
      queue.addOrder('vip');
      queue.addOrder('vip');
      queue.addOrder('vip');
      const order = queue.nextOrder()!; // id: 1001
      queue.nextOrder(); // id: 1002 removed
      queue.returnOrder(order);
      const pending = queue.pending();
      expect(pending).toEqual([
        { id: 1001, type: 'vip', status: 'pending' },
        { id: 1003, type: 'vip', status: 'pending' },
      ]);
    });

    it('should set returned order status to pending', () => {
      queue.addOrder('normal');
      const order = queue.nextOrder()!;
      order.status = 'processing';
      queue.returnOrder(order);
      expect(queue.pending()[0].status).toBe('pending');
    });
  });

  describe('pending', () => {
    it('should return vip orders before normal orders', () => {
      queue.addOrder('normal');
      queue.addOrder('normal');
      queue.addOrder('vip');
      const pending = queue.pending();
      expect(pending).toEqual([
        { id: 1003, type: 'vip', status: 'pending' },
        { id: 1001, type: 'normal', status: 'pending' },
        { id: 1002, type: 'normal', status: 'pending' },
      ]);
    });
  });
});
