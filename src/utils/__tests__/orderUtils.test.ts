import { describe, it, expect } from 'vitest';
import { createOrder, sortOrders } from '../orderUtils';
import type { Order } from '../../types';

describe('orderUtils', () => {
  describe('createOrder', () => {
    it('应该正确创建一个普通订单', () => {
      const order = createOrder(1, 'NORMAL');
      expect(order.id).toBe(1);
      expect(order.type).toBe('NORMAL');
      expect(order.status).toBe('PENDING');
      expect(order.createdAt).toBeLessThanOrEqual(Date.now());
    });

    it('应该正确创建一个 VIP 订单', () => {
      const order = createOrder(2, 'VIP');
      expect(order.id).toBe(2);
      expect(order.type).toBe('VIP');
      expect(order.status).toBe('PENDING');
    });
  });

  describe('sortOrders', () => {
    it('应该将 VIP 订单排在普通订单之前', () => {
      const orders: Order[] = [
        { id: 1, type: 'NORMAL', status: 'PENDING', createdAt: 100 },
        { id: 2, type: 'VIP', status: 'PENDING', createdAt: 200 },
        { id: 3, type: 'NORMAL', status: 'PENDING', createdAt: 300 },
      ];

      const sorted = sortOrders(orders);
      
      expect(sorted[0].id).toBe(2); // VIP 首先
      expect(sorted[1].id).toBe(1); // 然后是普通订单 1
      expect(sorted[2].id).toBe(3); // 最后是普通订单 3
    });

    it('同类型的订单应该按 ID (创建顺序) 排序', () => {
      const orders: Order[] = [
        { id: 2, type: 'VIP', status: 'PENDING', createdAt: 200 },
        { id: 1, type: 'VIP', status: 'PENDING', createdAt: 100 },
        { id: 3, type: 'NORMAL', status: 'PENDING', createdAt: 300 },
      ];

      const sorted = sortOrders(orders);
      
      expect(sorted[0].id).toBe(1); // VIP 1 应该排在 VIP 2 之前（按 ID 排序）
      expect(sorted[1].id).toBe(2);
      expect(sorted[2].id).toBe(3);
    });
  });
});
