import { OrderController } from './OrderController.js';

describe('OrderController', () => {
  let controller;

  beforeEach(() => {
    controller = new OrderController();
  });

  describe('Order Management', () => {
    test('should create a normal order', () => {
      const order = controller.createOrder('NORMAL');
      
      expect(order).toBeDefined();
      expect(order.id).toBe(1001);
      expect(order.type).toBe('NORMAL');
      expect(order.status).toBe('PENDING');
      expect(controller.getPendingOrders()).toHaveLength(1);
    });

    test('should create a VIP order', () => {
      const order = controller.createOrder('VIP');
      
      expect(order.type).toBe('VIP');
      expect(order.status).toBe('PENDING');
    });

    test('should place VIP orders before normal orders', () => {
      const normal1 = controller.createOrder('NORMAL');
      const vip1 = controller.createOrder('VIP');
      const normal2 = controller.createOrder('NORMAL');
      
      const pending = controller.getPendingOrders();
      expect(pending[0].id).toBe(vip1.id);
      expect(pending[1].id).toBe(normal1.id);
      expect(pending[2].id).toBe(normal2.id);
    });

    test('should maintain VIP order sequence', () => {
      const vip1 = controller.createOrder('VIP');
      const vip2 = controller.createOrder('VIP');
      const normal1 = controller.createOrder('NORMAL');
      
      const pending = controller.getPendingOrders();
      expect(pending[0].id).toBe(vip1.id);
      expect(pending[1].id).toBe(vip2.id);
      expect(pending[2].id).toBe(normal1.id);
    });

    test('should generate unique increasing order numbers', () => {
      const order1 = controller.createOrder('NORMAL');
      const order2 = controller.createOrder('VIP');
      const order3 = controller.createOrder('NORMAL');
      
      expect(order1.id).toBeLessThan(order2.id);
      expect(order2.id).toBeLessThan(order3.id);
    });
  });

  describe('Bot Management', () => {
    test('should add a bot', () => {
      const bot = controller.addBot();
      
      expect(bot).toBeDefined();
      expect(bot.id).toBe(1);
      expect(controller.getBots()).toHaveLength(1);
    });

    test('should remove the newest bot', () => {
      controller.addBot();
      const bot2 = controller.addBot();
      
      const removed = controller.removeBot();
      
      expect(removed.id).toBe(bot2.id);
      expect(controller.getBots()).toHaveLength(1);
    });

    test('should return null when removing bot from empty system', () => {
      const removed = controller.removeBot();
      expect(removed).toBeNull();
    });

    test('should return order to pending when removing processing bot', (done) => {
      const order = controller.createOrder('NORMAL');
      const bot = controller.addBot();
      
      // Give it a moment to start processing
      setTimeout(() => {
        expect(bot.status).toBe('PROCESSING');
        expect(controller.getPendingOrders()).toHaveLength(0);
        
        controller.removeBot();
        
        expect(controller.getPendingOrders()).toHaveLength(1);
        expect(controller.getPendingOrders()[0].status).toBe('PENDING');
        done();
      }, 100);
    });
  });

  describe('Order Processing', () => {
    test('should assign order to bot immediately', () => {
      controller.createOrder('NORMAL');
      const bot = controller.addBot();
      
      expect(bot.status).toBe('PROCESSING');
      expect(bot.currentOrder).toBeDefined();
      expect(controller.getPendingOrders()).toHaveLength(0);
    });

    test('should complete order after 10 seconds', (done) => {
      controller.createOrder('NORMAL');
      controller.addBot();
      
      setTimeout(() => {
        expect(controller.getCompletedOrders()).toHaveLength(1);
        expect(controller.getCompletedOrders()[0].status).toBe('COMPLETE');
        done();
      }, 10100);
    }, 11000);

    test('should set bot to IDLE when no orders available', () => {
      const bot = controller.addBot();
      
      expect(bot.status).toBe('IDLE');
      expect(bot.currentOrder).toBeNull();
    });

    test('should process next order after completion', (done) => {
      controller.createOrder('NORMAL');
      controller.createOrder('NORMAL');
      const bot = controller.addBot();
      
      setTimeout(() => {
        expect(controller.getCompletedOrders()).toHaveLength(1);
        expect(bot.status).toBe('PROCESSING');
        expect(bot.currentOrder).toBeDefined();
        done();
      }, 10100);
    }, 11000);
  });

  describe('Status Reporting', () => {
    test('should report correct system status', () => {
      controller.createOrder('NORMAL');
      controller.createOrder('VIP');
      controller.addBot();
      
      const status = controller.getStatus();
      
      expect(status.totalBots).toBe(1);
      expect(status.activeBots).toBe(1);
      expect(status.pendingOrders).toBe(1);
    });
  });
});
