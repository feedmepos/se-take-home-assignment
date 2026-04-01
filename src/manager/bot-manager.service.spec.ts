import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BotManagerService } from './bot-manager.service.js';

describe('BotManagerService', () => {
  let manager: BotManagerService;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new BotManagerService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('addNormalOrder', () => {
    it('should add a normal order to pending', () => {
      const order = manager.addNormalOrder();
      expect(order).toEqual({ id: 1001, type: 'normal', status: 'pending' });
      expect(manager.getPendingOrders()).toEqual([order]);
    });
  });

  describe('addVipOrder', () => {
    it('should add a vip order before normal orders', () => {
      manager.addNormalOrder();
      const vipOrder = manager.addVipOrder();
      const pending = manager.getPendingOrders();
      expect(pending[0]).toEqual(vipOrder);
      expect(pending[0].type).toBe('vip');
    });
  });

  describe('addBot', () => {
    it('should create a bot and immediately process a pending order', () => {
      manager.addNormalOrder();
      const bot = manager.addBot();
      expect(bot.status).toBe('processing');
      expect(bot.currentOrder?.id).toBe(1001);
      expect(manager.getPendingOrders()).toEqual([]);
    });

    it('should create an idle bot when no orders are pending', () => {
      const bot = manager.addBot();
      expect(bot.status).toBe('idle');
      expect(bot.currentOrder).toBeNull();
    });
  });

  describe('processing', () => {
    it('should complete an order after 10 seconds and pick up the next', () => {
      manager.addNormalOrder(); // id: 1
      manager.addNormalOrder(); // id: 2
      manager.addBot();

      vi.advanceTimersByTime(10_000);

      expect(manager.getCompletedOrders()).toHaveLength(1);
      expect(manager.getCompletedOrders()[0].id).toBe(1001);

      // Bot should now be processing order 2
      const bots = manager.getBots();
      expect(bots[0].status).toBe('processing');
      expect(bots[0].currentOrder?.id).toBe(1002);
    });

    it('should become idle when no more orders to process', () => {
      manager.addNormalOrder();
      manager.addBot();

      vi.advanceTimersByTime(10_000);

      const bots = manager.getBots();
      expect(bots[0].status).toBe('idle');
      expect(manager.getCompletedOrders()).toHaveLength(1);
    });

    it('should pick up new order when idle bot exists', () => {
      manager.addBot();
      manager.addNormalOrder();

      const bots = manager.getBots();
      expect(bots[0].status).toBe('processing');
      expect(bots[0].currentOrder?.id).toBe(1001);
    });
  });

  describe('removeBot', () => {
    it('should remove the newest bot', () => {
      manager.addBot();
      manager.addBot();

      const removed = manager.removeBot();

      expect(removed?.id).toBe(2);
      expect(manager.getBots()).toHaveLength(1);
    });

    it('should return null when no bots exist', () => {
      expect(manager.removeBot()).toBeNull();
    });

    it('should stop processing and return order to pending queue', () => {
      manager.addNormalOrder(); // id: 1
      manager.addNormalOrder(); // id: 2
      manager.addBot(); // processes order 1
      manager.addBot(); // processes order 2

      manager.removeBot(); // removes bot 2, order 2 returns to pending

      expect(manager.getPendingOrders()).toHaveLength(1);
      expect(manager.getPendingOrders()[0]).toEqual({
        id: 1002,
        type: 'normal',
        status: 'pending',
      });
    });

    it('should return order to correct position by id', () => {
      manager.addNormalOrder(); // id: 1
      manager.addNormalOrder(); // id: 2
      manager.addNormalOrder(); // id: 3
      manager.addBot(); // processes order 1

      manager.removeBot(); // removes bot, order 1 returns to pending

      const pending = manager.getPendingOrders();
      expect(pending.map((o) => o.id)).toEqual([1001, 1002, 1003]);
    });

    it('should return vip and normal orders to correct queues and positions', () => {
      manager.addVipOrder();
      manager.addNormalOrder();
      manager.addNormalOrder();
      manager.addNormalOrder();

      expect(manager.getPendingOrders().map((o) => o.id)).toEqual([1001, 1002, 1003, 1004]);

      const firstBot = manager.addBot(); // #1

      vi.advanceTimersByTime(5_000);

      const secondBot = manager.addBot(); // #2

      expect(firstBot.currentOrder?.id).toBe(1001);
      expect(secondBot.currentOrder?.id).toBe(1002);

      vi.advanceTimersByTime(5_000);

      expect(firstBot.currentOrder?.id).toBe(1003);

      expect(manager.getPendingOrders().map((o) => o.id)).toEqual([1004]);

      manager.removeBot(); // removes bot #2, order 1002 returns to pending

      expect(manager.getPendingOrders().map((o) => o.id)).toEqual([1002, 1004]);

      manager.removeBot(); // removes bot #1, order 1003 returns to pending
      
      expect(manager.getPendingOrders().map((o) => o.id)).toEqual([1002, 1003, 1004]);
    })

    it('should idle bot pick up returned order when processing bot is removed', () => {
      manager = new BotManagerService();
      manager.addBot();
      manager.addBot();
      manager.addNormalOrder();

      vi.advanceTimersByTime(5_000);

      const targetOrder = manager.addNormalOrder();

      vi.advanceTimersByTime(5_000);

      const bots = manager.getBots();

      expect(bots[0].status).toBe('idle');
      expect(bots[1].status).toBe('processing');

      manager.removeBot();

      const remainingBots = manager.getBots();
      expect(remainingBots).toHaveLength(1);

      expect(manager.getPendingOrders()).toHaveLength(0);

      expect(remainingBots[0].status).toBe('processing');
      expect(remainingBots[0].currentOrder?.id).toBe(targetOrder.id);
    });

    it('should not complete the order after bot is removed', () => {
      manager.addNormalOrder();
      manager.addBot();

      manager.removeBot();

      vi.advanceTimersByTime(10_000);

      expect(manager.getCompletedOrders()).toHaveLength(0);
    });
  });

  describe('vip priority', () => {
    it('should process vip orders before normal orders', () => {
      manager.addNormalOrder(); // id: 1
      manager.addNormalOrder(); // id: 2
      manager.addVipOrder();   // id: 3

      manager.addBot();

      // Bot should be processing VIP order (id: 3)
      const bots = manager.getBots();
      expect(bots[0].currentOrder?.id).toBe(1003);
      expect(bots[0].currentOrder?.type).toBe('vip');

      // After completing VIP, should process normal orders
      vi.advanceTimersByTime(10_000);
      expect(manager.getCompletedOrders()[0].id).toBe(1003);
      expect(bots[0].currentOrder?.id).toBe(1001);
    });

    it('should place vip order behind existing vip but before normal', () => {
      manager.addNormalOrder(); // id: 1
      manager.addVipOrder();   // id: 2
      manager.addVipOrder();   // id: 3

      const pending = manager.getPendingOrders();
      expect(pending.map((o) => o.id)).toEqual([1002, 1003, 1001]);
    });
  });
});
