const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// Reset state before each test
let state, orderService;

beforeEach(() => {
  // Clear require cache for stateful modules
  for (const key of Object.keys(require.cache)) {
    if (key.includes('src/')) delete require.cache[key];
  }
  ({ state } = require('../src/state'));
  orderService = require('../src/services/orderService');
});

describe('orderService', () => {
  describe('createOrder', () => {
    it('creates a NORMAL order with PENDING status', () => {
      const order = orderService.createOrder('NORMAL');
      assert.equal(order.type, 'NORMAL');
      assert.equal(order.status, 'PENDING');
      assert.ok(order.systemId);
      assert.ok(order.displayId);
      assert.ok(order.createdAt instanceof Date);
      assert.equal(order.completedAt, null);
    });

    it('creates a VIP order with PENDING status', () => {
      const order = orderService.createOrder('VIP');
      assert.equal(order.type, 'VIP');
      assert.equal(order.status, 'PENDING');
    });

    it('VIP order is inserted before NORMAL orders', () => {
      orderService.createOrder('NORMAL');
      orderService.createOrder('NORMAL');
      orderService.createOrder('VIP');

      const pending = orderService.getPendingOrders();
      assert.equal(pending[0].type, 'VIP');
      assert.equal(pending[1].type, 'NORMAL');
      assert.equal(pending[2].type, 'NORMAL');
    });

    it('multiple VIP orders maintain FIFO among themselves', () => {
      const vip1 = orderService.createOrder('VIP');
      const vip2 = orderService.createOrder('VIP');
      orderService.createOrder('NORMAL');

      const pending = orderService.getPendingOrders();
      assert.equal(pending[0].systemId, vip1.systemId);
      assert.equal(pending[1].systemId, vip2.systemId);
      assert.equal(pending[2].type, 'NORMAL');
    });

    it('NORMAL orders are appended in FIFO order', () => {
      const n1 = orderService.createOrder('NORMAL');
      const n2 = orderService.createOrder('NORMAL');

      const pending = orderService.getPendingOrders();
      assert.equal(pending[0].systemId, n1.systemId);
      assert.equal(pending[1].systemId, n2.systemId);
    });
  });

  describe('insertPending', () => {
    it('re-inserts a VIP order at correct position', () => {
      const vip1 = orderService.createOrder('VIP');
      orderService.createOrder('NORMAL');

      // Simulate removing vip1 from pending and reinserting
      const idx = state.orders.indexOf(vip1);
      state.orders.splice(idx, 1);
      vip1.status = 'PENDING';
      orderService.insertPending(vip1);

      const pending = orderService.getPendingOrders();
      assert.equal(pending[0].systemId, vip1.systemId);
    });

    it('re-inserts a NORMAL order after all pending orders', () => {
      orderService.createOrder('VIP');
      const n1 = orderService.createOrder('NORMAL');

      const idx = state.orders.indexOf(n1);
      state.orders.splice(idx, 1);
      n1.status = 'PENDING';
      orderService.insertPending(n1);

      const pending = orderService.getPendingOrders();
      assert.equal(pending[pending.length - 1].systemId, n1.systemId);
    });
  });
});
