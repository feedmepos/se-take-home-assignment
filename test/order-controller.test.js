/**
 * Unit tests for OrderController (Node test runner + mock timers).
 */
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { OrderController } = require('../src/order-controller');

describe('OrderController', () => {
  let controller;

  beforeEach(() => {
    controller = new OrderController(10000);
  });

  describe('order creation', () => {
    it('creates a normal order as PENDING in the pending queue', () => {
      const order = controller.createOrder('normal');
      assert.strictEqual(order.type, 'normal');
      assert.strictEqual(order.status, 'PENDING');
      assert.strictEqual(controller.pendingOrders.length, 1);
    });

    it('creates a VIP order as PENDING in the pending queue', () => {
      const order = controller.createOrder('vip');
      assert.strictEqual(order.type, 'vip');
      assert.strictEqual(order.status, 'PENDING');
      assert.strictEqual(controller.pendingOrders.length, 1);
    });

    it('assigns unique incrementing order ids', () => {
      const o1 = controller.createOrder('normal');
      const o2 = controller.createOrder('vip');
      const o3 = controller.createOrder('normal');
      assert.strictEqual(o1.id, 1);
      assert.strictEqual(o2.id, 2);
      assert.strictEqual(o3.id, 3);
    });

    it('places VIP before normal orders', () => {
      controller.createOrder('normal');
      controller.createOrder('vip');
      assert.strictEqual(controller.pendingOrders[0].type, 'vip');
      assert.strictEqual(controller.pendingOrders[1].type, 'normal');
    });

    it('places new VIP after existing VIPs and before normals', () => {
      controller.createOrder('normal');
      const vip1 = controller.createOrder('vip');
      const vip2 = controller.createOrder('vip');
      assert.strictEqual(controller.pendingOrders[0].id, vip1.id);
      assert.strictEqual(controller.pendingOrders[1].id, vip2.id);
      assert.strictEqual(controller.pendingOrders[2].type, 'normal');
    });

    it('keeps creation order within the same priority tier', () => {
      const n1 = controller.createOrder('normal');
      const n2 = controller.createOrder('normal');
      const v1 = controller.createOrder('vip');
      const n3 = controller.createOrder('normal');
      assert.deepStrictEqual(
        controller.pendingOrders.map(o => o.id),
        [v1.id, n1.id, n2.id, n3.id]
      );
    });
  });

  describe('bot processing', () => {
    it('picks up pending order when a bot is added', (t) => {
      t.mock.timers.enable({ apis: ['setTimeout'] });
      controller.createOrder('normal');
      controller.addBot();
      assert.strictEqual(controller.pendingOrders.length, 0);
      assert.strictEqual(controller.bots[0].status, 'PROCESSING');
      assert.strictEqual(controller.bots[0].currentOrder.id, 1);
    });

    it('completes order after processing time and bot goes IDLE', (t) => {
      t.mock.timers.enable({ apis: ['setTimeout'] });
      controller.createOrder('normal');
      controller.addBot();
      t.mock.timers.tick(10000);
      assert.strictEqual(controller.completedOrders.length, 1);
      assert.strictEqual(controller.completedOrders[0].status, 'COMPLETE');
      assert.strictEqual(controller.bots[0].status, 'IDLE');
    });

    it('processes VIP before normal when both exist', (t) => {
      t.mock.timers.enable({ apis: ['setTimeout'] });
      controller.createOrder('normal');
      controller.createOrder('vip');
      controller.addBot();
      assert.strictEqual(controller.bots[0].currentOrder.type, 'vip');
    });

    it('processes next order after one completes until queue empty', (t) => {
      t.mock.timers.enable({ apis: ['setTimeout'] });
      controller.createOrder('normal');
      controller.createOrder('normal');
      controller.addBot();

      t.mock.timers.tick(10000);
      assert.strictEqual(controller.completedOrders.length, 1);
      assert.strictEqual(controller.bots[0].status, 'PROCESSING');

      t.mock.timers.tick(10000);
      assert.strictEqual(controller.completedOrders.length, 2);
      assert.strictEqual(controller.bots[0].status, 'IDLE');
    });

    it('bot is IDLE when no pending orders', (t) => {
      t.mock.timers.enable({ apis: ['setTimeout'] });
      controller.createOrder('normal');
      controller.addBot();
      t.mock.timers.tick(10000);
      assert.strictEqual(controller.bots[0].status, 'IDLE');
      assert.strictEqual(controller.bots[0].currentOrder, null);
    });

    it('idle bot picks up new order immediately', (t) => {
      t.mock.timers.enable({ apis: ['setTimeout'] });
      controller.addBot();
      assert.strictEqual(controller.bots[0].status, 'IDLE');
      controller.createOrder('normal');
      assert.strictEqual(controller.bots[0].status, 'PROCESSING');
      assert.strictEqual(controller.pendingOrders.length, 0);
    });

    it('multiple bots process different orders in parallel', (t) => {
      t.mock.timers.enable({ apis: ['setTimeout'] });
      controller.createOrder('normal');
      controller.createOrder('normal');
      controller.addBot();
      controller.addBot();
      assert.strictEqual(controller.pendingOrders.length, 0);
      assert.strictEqual(controller.bots[0].status, 'PROCESSING');
      assert.strictEqual(controller.bots[1].status, 'PROCESSING');

      t.mock.timers.tick(10000);
      assert.strictEqual(controller.completedOrders.length, 2);
    });
  });

  describe('bot removal', () => {
    it('removes the newest bot', () => {
      controller.addBot();
      controller.addBot();
      const removed = controller.removeBot();
      assert.strictEqual(removed.id, 2);
      assert.strictEqual(controller.bots.length, 1);
      assert.strictEqual(controller.bots[0].id, 1);
    });

    it('returns order to pending when bot removed during processing', (t) => {
      t.mock.timers.enable({ apis: ['setTimeout'] });
      controller.createOrder('normal');
      controller.addBot();
      assert.strictEqual(controller.pendingOrders.length, 0);

      controller.removeBot();
      assert.strictEqual(controller.pendingOrders.length, 1);
      assert.strictEqual(controller.pendingOrders[0].status, 'PENDING');
      assert.strictEqual(controller.pendingOrders[0].id, 1);
    });

    it('re-inserts returned normal order at correct position', (t) => {
      t.mock.timers.enable({ apis: ['setTimeout'] });
      controller.createOrder('normal');
      controller.createOrder('vip');
      controller.createOrder('normal');

      controller.addBot();
      controller.addBot();

      controller.removeBot();
      assert.deepStrictEqual(
        controller.pendingOrders.map(o => o.id),
        [1, 3]
      );
    });

    it('re-inserts returned VIP order at correct position', (t) => {
      t.mock.timers.enable({ apis: ['setTimeout'] });
      controller.createOrder('normal');
      controller.createOrder('vip');
      controller.createOrder('vip');
      controller.createOrder('normal');

      controller.addBot();

      controller.removeBot();
      assert.deepStrictEqual(
        controller.pendingOrders.map(o => o.id),
        [2, 3, 1, 4]
      );
    });

    it('removeBot returns null when no bots', () => {
      const result = controller.removeBot();
      assert.strictEqual(result, null);
    });

    it('cancels timer when bot removed; order not completed', (t) => {
      t.mock.timers.enable({ apis: ['setTimeout'] });
      controller.createOrder('normal');
      controller.addBot();
      controller.removeBot();
      t.mock.timers.tick(10000);
      assert.strictEqual(controller.completedOrders.length, 0);
      assert.strictEqual(controller.pendingOrders.length, 1);
    });
  });
});
