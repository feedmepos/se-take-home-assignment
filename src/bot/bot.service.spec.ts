import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BotService } from './bot.service.js';
import { Order } from '../order/order.model.js';
import { PROCESSING_TIME_MS } from '../constants.js';

describe('BotService', () => {
  let service: BotService;

  beforeEach(() => {
    service = new BotService();
  });

  describe('createBot', () => {
    it('should create a bot with incremented id and idle status', () => {
      const bot = service.createBot();
      expect(bot).toEqual({
        id: 1,
        status: 'idle',
        currentOrder: null,
        timer: null,
      });
    });

    it('should increment bot ids', () => {
      const bot1 = service.createBot();
      const bot2 = service.createBot();
      expect(bot1.id).toBe(1);
      expect(bot2.id).toBe(2);
    });
  });

  describe('startProcessing', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should set bot to processing with the order', () => {
      const bot = service.createBot();
      const order: Order = { id: 1, type: 'normal', status: 'pending' };
      const onComplete = vi.fn();

      service.startProcessing(bot, order, onComplete);

      expect(bot.status).toBe('processing');
      expect(bot.currentOrder).toBe(order);
      expect(order.status).toBe('processing');
    });

    it('should call onComplete after PROCESSING_TIME_MS', () => {
      const bot = service.createBot();
      const order: Order = { id: 1, type: 'normal', status: 'pending' };
      const onComplete = vi.fn();

      service.startProcessing(bot, order, onComplete);

      expect(onComplete).not.toHaveBeenCalled();

      vi.advanceTimersByTime(PROCESSING_TIME_MS);

      expect(onComplete).toHaveBeenCalledOnce();
    });
  });

  describe('stopProcessing', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should stop processing and return the order', () => {
      const bot = service.createBot();
      const order: Order = { id: 1, type: 'normal', status: 'pending' };
      const onComplete = vi.fn();

      service.startProcessing(bot, order, onComplete);
      const returned = service.stopProcessing(bot);

      expect(returned).toBe(order);
      expect(bot.status).toBe('idle');
      expect(bot.currentOrder).toBeNull();
      expect(bot.timer).toBeNull();
    });

    it('should cancel the timer so onComplete is not called', () => {
      const bot = service.createBot();
      const order: Order = { id: 1, type: 'normal', status: 'pending' };
      const onComplete = vi.fn();

      service.startProcessing(bot, order, onComplete);
      service.stopProcessing(bot);

      vi.advanceTimersByTime(PROCESSING_TIME_MS);

      expect(onComplete).not.toHaveBeenCalled();
    });

    it('should return null if bot is idle', () => {
      const bot = service.createBot();
      expect(service.stopProcessing(bot)).toBeNull();
    });
  });
});
