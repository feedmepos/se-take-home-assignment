const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

let state, orderService, botService;

beforeEach(() => {
  for (const key of Object.keys(require.cache)) {
    if (key.includes('src/')) delete require.cache[key];
  }
  ({ state } = require('../src/state'));
  orderService = require('../src/services/orderService');
  botService = require('../src/services/botService');
});

afterEach(() => {
  // Clear all timers
  state.bots.forEach(b => { if (b.timer) clearTimeout(b.timer); });
});

describe('botService', () => {
  describe('addBot', () => {
    it('adds a bot in IDLE state when no orders', () => {
      const bot = botService.addBot();
      assert.equal(bot.status, 'IDLE');
      assert.equal(bot.currentOrderId, null);
      assert.equal(state.bots.length, 1);
    });

    it('bot immediately picks up a pending order', () => {
      orderService.createOrder('NORMAL');
      // clear bots added by tryAssignIdleBot (none since no bots yet)
      const bot = botService.addBot();
      assert.equal(bot.status, 'PROCESSING');
      assert.ok(bot.currentOrderId);
    });

    it('order status changes to PROCESSING when bot picks it up', () => {
      const order = orderService.createOrder('NORMAL');
      botService.addBot();
      assert.equal(order.status, 'PROCESSING');
    });
  });

  describe('removeNewestBot', () => {
    it('removes the newest bot', () => {
      botService.addBot();
      botService.addBot();
      assert.equal(state.bots.length, 2);
      botService.removeNewestBot();
      assert.equal(state.bots.length, 1);
    });

    it('returns null when no bots exist', () => {
      const result = botService.removeNewestBot();
      assert.equal(result, null);
    });

    it('returns processing order to pending queue when bot removed', () => {
      const order = orderService.createOrder('NORMAL');
      botService.addBot();
      assert.equal(order.status, 'PROCESSING');

      botService.removeNewestBot();
      assert.equal(order.status, 'PENDING');
      assert.equal(order.processingBotId, null);

      const pending = orderService.getPendingOrders();
      assert.ok(pending.find(o => o.systemId === order.systemId));
    });

    it('returned VIP order goes back before NORMAL orders', () => {
      const vip = orderService.createOrder('VIP');
      const normal = orderService.createOrder('NORMAL');
      botService.addBot();
      // bot is processing VIP
      assert.equal(vip.status, 'PROCESSING');

      botService.removeNewestBot();
      const pending = orderService.getPendingOrders();
      assert.equal(pending[0].systemId, vip.systemId);
      assert.equal(pending[1].systemId, normal.systemId);
    });
  });

  describe('tryAssignIdleBot', () => {
    it('assigns a new order to an idle bot', () => {
      const bot = botService.addBot();
      assert.equal(bot.status, 'IDLE');

      orderService.createOrder('NORMAL');
      botService.tryAssignIdleBot();
      assert.equal(bot.status, 'PROCESSING');
    });
  });
});
