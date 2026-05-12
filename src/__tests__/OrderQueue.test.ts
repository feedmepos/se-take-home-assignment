import { OrderQueue } from '../OrderQueue';
import { OrderType, OrderStatus } from '../types';

describe('OrderQueue', () => {
  let queue: OrderQueue;

  beforeEach(() => {
    queue = new OrderQueue();
  });

  describe('createOrder', () => {
    it('should create a normal order with incrementing ID starting from 1001', () => {
      const order = queue.createOrder(OrderType.NORMAL);
      expect(order.id).toBe(1001);
      expect(order.type).toBe(OrderType.NORMAL);
      expect(order.status).toBe(OrderStatus.PENDING);
    });

    it('should create a VIP order with correct type', () => {
      const order = queue.createOrder(OrderType.VIP);
      expect(order.id).toBe(1001);
      expect(order.type).toBe(OrderType.VIP);
      expect(order.status).toBe(OrderStatus.PENDING);
    });

    it('should increment order IDs', () => {
      const order1 = queue.createOrder(OrderType.NORMAL);
      const order2 = queue.createOrder(OrderType.NORMAL);
      const order3 = queue.createOrder(OrderType.VIP);
      expect(order1.id).toBe(1001);
      expect(order2.id).toBe(1002);
      expect(order3.id).toBe(1003);
    });
  });

  describe('VIP priority', () => {
    it('should return VIP order before Normal order', () => {
      queue.createOrder(OrderType.NORMAL); // #1001
      queue.createOrder(OrderType.NORMAL); // #1002
      queue.createOrder(OrderType.VIP);    // #1003

      const next = queue.getNextOrder();
      expect(next?.type).toBe(OrderType.VIP);
      expect(next?.id).toBe(1003);
    });

    it('should maintain FIFO order within same type', () => {
      queue.createOrder(OrderType.VIP);    // #1001
      queue.createOrder(OrderType.VIP);    // #1002
      queue.createOrder(OrderType.NORMAL); // #1003

      const first = queue.getNextOrder();
      expect(first?.id).toBe(1001);

      const second = queue.getNextOrder();
      expect(second?.id).toBe(1002);

      const third = queue.getNextOrder();
      expect(third?.id).toBe(1003);
    });

    it('should place VIP order behind existing VIP orders but ahead of Normal', () => {
      queue.createOrder(OrderType.NORMAL); // #1001
      queue.createOrder(OrderType.VIP);    // #1002
      queue.createOrder(OrderType.NORMAL); // #1003
      queue.createOrder(OrderType.VIP);    // #1004

      // Order should be: VIP#1002, VIP#1004, Normal#1001, Normal#1003
      const first = queue.getNextOrder();
      expect(first?.id).toBe(1002);

      const second = queue.getNextOrder();
      expect(second?.id).toBe(1004);

      const third = queue.getNextOrder();
      expect(third?.id).toBe(1001);

      const fourth = queue.getNextOrder();
      expect(fourth?.id).toBe(1003);
    });
  });

  describe('getNextOrder', () => {
    it('should return undefined when no orders pending', () => {
      expect(queue.getNextOrder()).toBeUndefined();
    });

    it('should remove order from queue when retrieved', () => {
      queue.createOrder(OrderType.NORMAL);
      queue.getNextOrder();
      expect(queue.hasPendingOrders()).toBe(false);
    });
  });

  describe('hasPendingOrders', () => {
    it('should return false when no orders', () => {
      expect(queue.hasPendingOrders()).toBe(false);
    });

    it('should return true when orders exist', () => {
      queue.createOrder(OrderType.NORMAL);
      expect(queue.hasPendingOrders()).toBe(true);
    });
  });

  describe('reAddOrder', () => {
    it('should re-add a VIP order back to the VIP queue', () => {
      const order = queue.createOrder(OrderType.VIP);
      const retrieved = queue.getNextOrder();
      expect(retrieved).toBeDefined();

      queue.reAddOrder(retrieved!);
      expect(queue.hasPendingOrders()).toBe(true);

      const reRetrieved = queue.getNextOrder();
      expect(reRetrieved?.id).toBe(order.id);
      expect(reRetrieved?.status).toBe(OrderStatus.PENDING);
    });

    it('should re-add a Normal order back to the Normal queue', () => {
      queue.createOrder(OrderType.VIP); // VIP first
      const normalOrder = queue.createOrder(OrderType.NORMAL);

      // Get both orders
      queue.getNextOrder(); // VIP
      const retrieved = queue.getNextOrder(); // Normal

      queue.reAddOrder(retrieved!);
      const reRetrieved = queue.getNextOrder();
      expect(reRetrieved?.id).toBe(normalOrder.id);
    });

    it('should maintain VIP priority after re-adding', () => {
      const vipOrder = queue.createOrder(OrderType.VIP);
      const normalOrder = queue.createOrder(OrderType.NORMAL);

      // Remove both
      queue.getNextOrder(); // VIP
      queue.getNextOrder(); // Normal

      // Re-add normal first, then VIP
      queue.reAddOrder(normalOrder);
      queue.reAddOrder(vipOrder);

      // VIP should still come first
      const next = queue.getNextOrder();
      expect(next?.type).toBe(OrderType.VIP);
    });
  });

  describe('getPendingOrders', () => {
    it('should return all pending orders with VIP first', () => {
      queue.createOrder(OrderType.NORMAL);
      queue.createOrder(OrderType.VIP);
      queue.createOrder(OrderType.NORMAL);

      const pending = queue.getPendingOrders();
      expect(pending.length).toBe(3);
      expect(pending[0].type).toBe(OrderType.VIP);
      expect(pending[1].type).toBe(OrderType.NORMAL);
      expect(pending[2].type).toBe(OrderType.NORMAL);
    });
  });

  describe('getCountByType', () => {
    it('should count VIP and Normal orders separately', () => {
      queue.createOrder(OrderType.NORMAL);
      queue.createOrder(OrderType.VIP);
      queue.createOrder(OrderType.NORMAL);
      queue.createOrder(OrderType.VIP);

      expect(queue.getCountByType(OrderType.VIP)).toBe(2);
      expect(queue.getCountByType(OrderType.NORMAL)).toBe(2);
    });
  });
});
