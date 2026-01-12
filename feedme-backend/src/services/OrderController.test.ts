import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { OrderController } from './OrderController.js';

describe('OrderController', () => {
  let controller: OrderController;

  beforeEach(() => {
    controller = new OrderController();
  });

  describe('Order Creation', () => {
    it('should create a normal order with unique ID', () => {
      const order1 = controller.createNormalOrder();
      const order2 = controller.createNormalOrder();
      
      assert.strictEqual(order1.id, 1001);
      assert.strictEqual(order2.id, 1002);
      assert.strictEqual(order1.type, 'NORMAL');
      assert.strictEqual(order2.type, 'NORMAL');
    });

    it('should create a VIP order with unique ID', () => {
      const order = controller.createVIPOrder();
      
      assert.strictEqual(order.id, 1001);
      assert.strictEqual(order.type, 'VIP');
      assert.strictEqual(order.status, 'PENDING');
    });
  });

  describe('VIP Priority Queue', () => {
    it('should place VIP orders before NORMAL orders', () => {
      controller.createNormalOrder(); // 1001
      controller.createVIPOrder();    // 1002
      controller.createNormalOrder(); // 1003
      
      const orders = controller.getAllOrders();
      assert.strictEqual(orders[0].id, 1002); // VIP should be first
      assert.strictEqual(orders[1].id, 1001); // Then first NORMAL
      assert.strictEqual(orders[2].id, 1003); // Then second NORMAL
    });

    it('should place new VIP orders after existing VIP orders', () => {
      controller.createVIPOrder();    // 1001
      controller.createNormalOrder(); // 1002
      controller.createVIPOrder();    // 1003
      
      const orders = controller.getAllOrders();
      assert.strictEqual(orders[0].id, 1001); // First VIP
      assert.strictEqual(orders[1].id, 1003); // Second VIP (after first VIP)
      assert.strictEqual(orders[2].id, 1002); // Then NORMAL
    });
  });

  describe('Bot Management', () => {
    it('should create bots with unique IDs', () => {
      const bot1 = controller.addBot();
      const bot2 = controller.addBot();
      
      assert.strictEqual(bot1.id, 1);
      assert.strictEqual(bot2.id, 2);
    });

    it('should return null when removing bot from empty system', () => {
      const bot = controller.removeBot();
      assert.strictEqual(bot, null);
    });

    it('should remove the newest bot', () => {
      controller.addBot();
      controller.addBot();
      
      const removedBot = controller.removeBot();
      assert.strictEqual(removedBot?.id, 2); // Newest bot removed
      
      const bots = controller.getAllBots();
      assert.strictEqual(bots.length, 1);
      assert.strictEqual(bots[0].id, 1);
    });
  });

  describe('Order Processing', () => {
    it('should assign orders to bots when bots are available', async () => {
      controller.createNormalOrder();
      controller.addBot();
      
      // Wait a bit for assignment
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const orders = controller.getAllOrders();
      assert.strictEqual(orders[0].status, 'PROCESSING');
    });

    it('should prioritize VIP orders over NORMAL orders', async () => {
      controller.createNormalOrder(); // 1001
      controller.createVIPOrder();    // 1002
      controller.addBot();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const orders = controller.getAllOrders();
      const processingOrder = orders.find(o => o.status === 'PROCESSING');
      assert.strictEqual(processingOrder?.id, 1002); // VIP should be processed first
    });
  });

  describe('Bot Removal During Processing', () => {
    it('should return order to PENDING when bot is removed during processing', async () => {
      controller.createNormalOrder();
      controller.addBot();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const orderBefore = controller.getAllOrders()[0];
      assert.strictEqual(orderBefore.status, 'PROCESSING');
      
      controller.removeBot();
      
      const orderAfter = controller.getAllOrders()[0];
      assert.strictEqual(orderAfter.status, 'PENDING');
    });
  });

  describe('Status', () => {
    it('should return correct status counts', () => {
      controller.createNormalOrder();
      controller.createVIPOrder();
      controller.addBot();
      
      const status = controller.getStatus();
      assert.strictEqual(status.orders.total, 2);
      assert.ok(status.orders.pending >= 0);
      assert.strictEqual(status.bots.total, 1);
    });
  });
});

