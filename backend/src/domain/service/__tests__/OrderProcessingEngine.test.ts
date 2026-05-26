import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OrderProcessingEngine } from '../OrderProcessingEngine';

describe('OrderProcessingEngine', () => {
  let engine: OrderProcessingEngine;

  beforeEach(() => {
    vi.useFakeTimers();
    engine = new OrderProcessingEngine();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createOrder', () => {
    it('should create a Normal order with unique increasing id', () => {
      const o1 = engine.createOrder('NORMAL');
      const o2 = engine.createOrder('NORMAL');
      expect(o1.id).toBe(1);
      expect(o2.id).toBe(2);
      expect(o1.type).toBe('NORMAL');
      expect(o1.status).toBe('PENDING');
    });

    it('should create a VIP order with unique increasing id', () => {
      const o1 = engine.createOrder('VIP');
      const o2 = engine.createOrder('NORMAL');
      const o3 = engine.createOrder('VIP');
      expect(o1.id).toBe(1);
      expect(o2.id).toBe(2);
      expect(o3.id).toBe(3);
    });

    it('should place Normal orders in FIFO order', () => {
      engine.createOrder('NORMAL');
      engine.createOrder('NORMAL');
      engine.createOrder('NORMAL');
      const orders = engine.getOrders();
      expect(orders.map((o) => o.id)).toEqual([1, 2, 3]);
    });

    it('should place VIP order before all Normal orders', () => {
      engine.createOrder('NORMAL');
      engine.createOrder('NORMAL');
      engine.createOrder('VIP');
      const orders = engine.getOrders();
      expect(orders.map((o) => o.id)).toEqual([3, 1, 2]);
    });

    it('should place VIP order after existing VIP orders', () => {
      engine.createOrder('VIP');
      engine.createOrder('NORMAL');
      engine.createOrder('VIP');
      const orders = engine.getOrders();
      expect(orders.map((o) => o.id)).toEqual([1, 3, 2]);
    });
  });

  describe('addBot', () => {
    it('should create bot and start processing pending order', () => {
      engine.createOrder('NORMAL');
      const bot = engine.addBot();

      expect(bot.name).toBe('Bot-1');
      expect(bot.status).toBe('PROCESSING');
      expect(bot.currentOrderId).toBe(1);
    });

    it('should assign bot IDs incrementally', () => {
      const b1 = engine.addBot();
      const b2 = engine.addBot();
      expect(b1.id).toBe(1);
      expect(b2.id).toBe(2);
    });

    it('should create IDLE bot when no pending orders', () => {
      const bot = engine.addBot();
      expect(bot.status).toBe('IDLE');
      expect(bot.currentOrderId).toBeUndefined();
    });

    it('should only assign an order to one bot when multiple idle bots exist', () => {
      // Create multiple idle bots first
      const bot1 = engine.addBot();
      const bot2 = engine.addBot();
      expect(bot1.status).toBe('IDLE');
      expect(bot2.status).toBe('IDLE');

      // Now create a single order
      engine.createOrder('NORMAL');

      // The order should be PROCESSING, not PENDING
      const orders = engine.getOrders();
      expect(orders[0].status).toBe('PROCESSING');

      // Only one bot should be processing, the other should stay IDLE
      const bots = engine.getBots();
      const processingBots = bots.filter((b) => b.status === 'PROCESSING');
      const idleBots = bots.filter((b) => b.status === 'IDLE');

      expect(processingBots.length).toBe(1);
      expect(idleBots.length).toBe(1);
      expect(processingBots[0].currentOrderId).toBe(1);
      expect(idleBots[0].currentOrderId).toBeUndefined();
    });

    it('should emit bot:status_changed when bot starts processing', () => {
      const listener = vi.fn();
      engine.addListener('bot:status_changed', listener);
      engine.createOrder('NORMAL');
      engine.addBot();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          botId: 1,
          status: 'PROCESSING',
          currentOrderId: 1,
        }),
      );
    });

    it('should wake IDLE bot when new order arrives', () => {
      const bot = engine.addBot();
      expect(bot.status).toBe('IDLE');

      const listener = vi.fn();
      engine.addListener('bot:status_changed', listener);

      engine.createOrder('NORMAL');
      expect(bot.status).toBe('PROCESSING');
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ botId: 1, status: 'PROCESSING' }),
      );
    });
  });

  describe('order processing', () => {
    it('should set order to PROCESSING when bot takes it', () => {
      engine.createOrder('NORMAL');
      engine.addBot();

      const orders = engine.getOrders();
      expect(orders[0].status).toBe('PROCESSING');
    });

    it('should complete order after 10 seconds', () => {
      const listener = vi.fn();
      engine.addListener('order:completed', listener);

      engine.createOrder('NORMAL');
      engine.addBot();

      vi.advanceTimersByTime(10_000);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, status: 'COMPLETE' }),
      );
    });

    it('should process VIP orders before Normal orders', () => {
      engine.createOrder('NORMAL');
      engine.createOrder('NORMAL');
      engine.createOrder('VIP');

      const bot = engine.addBot();
      expect(bot.currentOrderId).toBe(3); // VIP order picked first
    });

    it('should process next order after completion', () => {
      engine.createOrder('NORMAL');
      engine.createOrder('NORMAL');
      const bot = engine.addBot();
      expect(bot.currentOrderId).toBe(1);

      vi.advanceTimersByTime(10_000);
      expect(bot.currentOrderId).toBe(2);
    });

    it('should become IDLE when no more orders', () => {
      engine.createOrder('NORMAL');
      const bot = engine.addBot();

      vi.advanceTimersByTime(10_000);
      expect(bot.status).toBe('IDLE');
    });

    it('should emit bot:status_changed when bot becomes IDLE', () => {
      const listener = vi.fn();
      engine.addListener('bot:status_changed', listener);

      engine.createOrder('NORMAL');
      engine.addBot();

      vi.advanceTimersByTime(10_000);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ botId: 1, status: 'IDLE' }),
      );
    });
  });

  describe('removeBot', () => {
    it('should remove the newest bot', () => {
      engine.addBot();
      engine.addBot();
      engine.addBot();
      expect(engine.getBots().length).toBe(3);

      engine.removeBot();
      const bots = engine.getBots();
      expect(bots.length).toBe(2);
      expect(bots.map((b) => b.id)).toEqual([1, 2]);
    });

    it('should return processing order to PENDING position', () => {
      engine.createOrder('VIP');
      engine.createOrder('NORMAL');
      engine.addBot();

      // Verify order is PROCESSING before removal
      const ordersBefore = engine.getOrders();
      expect(ordersBefore[0].status).toBe('PROCESSING');

      engine.removeBot();

      // After removal, order should be back to PENDING and maintain VIP priority
      const orders = engine.getOrders();
      const pending = orders.filter((o) => o.status === 'PENDING');
      expect(pending.length).toBe(2);
      expect(pending[0].id).toBe(1); // VIP still first
      expect(pending[0].status).toBe('PENDING');
    });

    it('should do nothing when no bots exist', () => {
      engine.removeBot();
      expect(engine.getBots().length).toBe(0);
    });

    it('should clear the timer when removing processing bot', () => {
      engine.createOrder('NORMAL');
      engine.addBot();

      const listener = vi.fn();
      engine.addListener('order:completed', listener);

      engine.removeBot();
      vi.advanceTimersByTime(10_000);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should dispatch returned order to an idle bot', () => {
      engine.createOrder('NORMAL');
      engine.addBot();
      vi.advanceTimersByTime(5_000);

      engine.createOrder('NORMAL');
      engine.addBot();
      vi.advanceTimersByTime(5_000);

      engine.removeBot();

      const bots = engine.getBots();
      expect(bots).toHaveLength(1);
      expect(bots[0].status).toBe('PROCESSING');
      expect(bots[0].currentOrderId).toBe(2);
      expect(engine.getOrders().find((o) => o.id === 2)?.status).toBe('PROCESSING');

      vi.advanceTimersByTime(10_000);
      expect(engine.getOrders().find((o) => o.id === 2)?.status).toBe('COMPLETE');
    });
  });

  describe('getOrders', () => {
    it('should return all orders including completed ones', () => {
      engine.createOrder('NORMAL');
      engine.addBot();
      vi.advanceTimersByTime(10_000);

      const orders = engine.getOrders();
      expect(orders.length).toBe(1);
      expect(orders[0].status).toBe('COMPLETE');
    });
  });
});
