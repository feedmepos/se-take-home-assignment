import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrderController } from './order.controller';

describe('OrderController', () => {
  let controller: OrderController;
  let logs: string[] = [];

  beforeEach(() => {
    logs = [];
    controller = new OrderController((msg) => logs.push(msg));
    vi.useFakeTimers(); // Use fake timers for the test suite
  });

  function expectControllerState(
    completed: number, 
    normal: number, 
    vip: number, 
    bots: number, 
    pending: number
  ) {
    expect(controller.getStatus().completedOrders).toBe(completed);
    expect(controller.getStatus().normalOrders).toBe(normal);
    expect(controller.getStatus().vipOrders).toBe(vip);
    expect(controller.getBots().length).toBe(bots);
    expect(controller.getPendingOrders().length).toBe(pending);
  }

  describe('Order Creation', () => {
    it('should create normal orders with incrementing and unique IDs starting from 1001', () => {
      controller.createOrder('Normal');
      controller.createOrder('Normal');
      controller.createOrder('Normal');

      expect(logs[0]).toContain('Order #1001');
      expect(logs[1]).toContain('Order #1002');
      expect(logs[2]).toContain('Order #1003');
    });

    it('should create VIP orders', () => {
      controller.createOrder('VIP');

      expect(logs[0]).toContain('VIP Order #1001');
    });

    it('should track pending orders correctly', () => {
      controller.createOrder('Normal');
      controller.createOrder('VIP');

      const pending = controller.getPendingOrders();

      expect(controller.getStatus().pendingOrders).toBe(2);
      expect(pending[0].type).toBe('VIP');
      expect(pending[1].type).toBe('Normal');
    });
  });

  describe('Priority Queue', () => {
    it('should place VIP orders before normal orders', () => {
      controller.createOrder('Normal');
      controller.createOrder('VIP');
      controller.createOrder('Normal');

      const pending = controller.getPendingOrders();
      expect(pending).toMatchObject([
        { id: 1002, type: 'VIP' },
        { id: 1001, type: 'Normal' },
        { id: 1003, type: 'Normal' },
      ]);
    });

    it('should maintain FIFO order within VIP orders', () => {
      controller.createOrder('VIP');
      controller.createOrder('VIP');
      controller.createOrder('VIP');

      const pending = controller.getPendingOrders();
      expect(pending[0].id).toBe(1001);
      expect(pending[1].id).toBe(1002);
      expect(pending[2].id).toBe(1003);
    });

    it('should maintain FIFO order within normal orders', () => {
      controller.createOrder('Normal');
      controller.createOrder('Normal');
      controller.createOrder('Normal');

      const pending = controller.getPendingOrders();
      expect(pending[0].id).toBe(1001);
      expect(pending[1].id).toBe(1002);
      expect(pending[2].id).toBe(1003);
    });
  });

  describe('Bot Management', () => {
    it('should add bots', () => {
      controller.addBot();
      controller.addBot();

      expect(controller.getStatus().activeBots).toBe(2);
      expect(logs.some(l => l.includes('Bot #1 created'))).toBe(true);
      expect(logs.some(l => l.includes('Bot #2 created'))).toBe(true);
    });

    it('should remove newest bot', () => {
      controller.addBot();
      controller.addBot();
      controller.removeBot();

      expect(controller.getStatus().activeBots).toBe(1);
      expect(logs.some(l => l.includes('Bot #2 destroyed while IDLE'))).toBe(true);
    });

    it('should return error log when removing bot from empty array', () => {
      controller.removeBot();
      expect(logs.some(l => l.includes('No bot is available to remove'))).toBe(true);
    });
  });

  describe('Bot Processing', () => {
    it('should process one order at a time per bot', async () => {
      controller.addBot();
      controller.createOrder('Normal');
      
      expect(logs.some(l => l.includes('Bot #1 picked up Normal Order #1001'))).toBe(true);
      
      controller.createOrder('Normal');
      
      const pickupLogs = logs.filter(l => l.includes('picked up'));
      expect(pickupLogs.length).toBe(1); // Only 1 pickup, not 2
      expect(controller.getPendingOrders().length).toBe(1);

      await vi.advanceTimersByTimeAsync(10010);

      const completedLog = logs.filter(l => l.includes('completed'));
      expect(completedLog?.length).toBe(1);

      expect(logs.some(l => l.includes('Bot #1 picked up Normal Order #1002'))).toBe(true);
      expect(pickupLogs.length).toBe(1);

      await vi.advanceTimersByTimeAsync(10010);

      const updatedCompletedLog = logs.filter(l => l.includes('completed'));
      expect(updatedCompletedLog.length).toBe(2);
      expectControllerState(2, 2, 0, 1, 0);
    });

    it('should become idle after completing an order', async () => {
      controller.addBot();
      controller.createOrder('Normal');
      
      await vi.advanceTimersByTimeAsync(10010);

      expectControllerState(1, 1, 0, 1, 0);
    });

    it('should take 10 seconds to complete an order', async () => {
      controller.addBot();
      controller.createOrder('Normal');
      
      await vi.advanceTimersByTimeAsync(10010);
      
      const completedLog = logs.find(l => l.includes('completed') && l.includes('Order #1001'));
      expect(completedLog).toBeDefined();
      expect(completedLog).toContain('Processing time: 10s');
      expectControllerState(1, 1, 0, 1, 0);
    });

    it('should pick up pending order when both bots are idle', async () => {
      controller.addBot();
      controller.addBot();
      controller.createOrder('Normal');

      expect(logs.some(l => l.includes('Bot #1 picked up Normal Order #1001'))).toBe(true);

      await vi.advanceTimersByTimeAsync(10010);

      expect(controller.getPendingOrders().length).toBe(0);
      expectControllerState(1, 1, 0, 2, 0);
    });

    it('should allow multiple bots to process orders in parallel', async () => {
      controller.addBot();
      controller.addBot();
      controller.createOrder('Normal');
      controller.createOrder('Normal');
      
      // Both bots should have picked up an order
      expect(logs.filter(l => l.includes('picked up')).length).toBe(2);
    });

    it('should have only one bot pick up a single order when multiple bots are idle', () => {
      controller.addBot();
      controller.addBot();
      controller.addBot();
      controller.createOrder('Normal');

      const pickupLogs = logs.filter(l => l.includes('picked up'));
      expect(pickupLogs.length).toBe(1);
      expect(pickupLogs[0]).toContain('Bot #1');
    });

    it('should destroy the newest bot if removed while IDLE', () => {
      controller.addBot();
      controller.addBot();
      controller.removeBot();

      expect(logs.some(l => l.includes('Bot #2 destroyed while IDLE'))).toBe(true);
      expect(controller.getStatus().activeBots).toBe(1);
    });

    it('should requeue order if bot is removed while processing and maintain order VIP priority', async () => {
      controller.createOrder('VIP');
      controller.createOrder('Normal');
      controller.createOrder('VIP');
      controller.addBot();

      expect(logs.some(l => l.includes('Bot #1 picked up VIP Order #1001'))).toBe(true);

      controller.removeBot();

      expect(controller.getPendingOrders().length).toBe(3);
      expect(controller.getPendingOrders()[0].id).toBe(1001);
      expect(controller.getPendingOrders()[1].id).toBe(1003);
      expect(controller.getPendingOrders()[2].id).toBe(1002);
      expectControllerState(0, 1, 2, 0, 3);
    });

    it('should requeue order if bot is removed while processing and maintain order Normal priority', async () => {
      controller.createOrder('Normal');
      controller.createOrder('Normal');
      controller.addBot();

      expect(logs.some(l => l.includes('Bot #1 picked up Normal Order #1001'))).toBe(true);

      controller.removeBot();

      expect(controller.getPendingOrders().length).toBe(2);
      expect(controller.getPendingOrders()[0].id).toBe(1001);
      expect(controller.getPendingOrders()[1].id).toBe(1002);
      expectControllerState(0, 2, 0, 0, 2);
    });

    it('should requeue order if bot is removed while processing and maintain order VIP and Normal priority', async () => {
      controller.createOrder('Normal');
      controller.createOrder('VIP');
      controller.createOrder('Normal');
      controller.createOrder('VIP');
      controller.addBot();
      controller.addBot();

      expect(logs.some(l => l.includes('Bot #1 picked up VIP Order #1002'))).toBe(true);
      expect(logs.some(l => l.includes('Bot #2 picked up VIP Order #1004'))).toBe(true);

      controller.removeBot();
      expect(logs.some(l => l.includes('Bot #2 destroyed while processing Order #1004'))).toBe(true);

      expect(controller.getPendingOrders().length).toBe(3);
      expect(controller.getPendingOrders()[0].id).toBe(1004);
      expect(controller.getPendingOrders()[1].id).toBe(1001);
      expect(controller.getPendingOrders()[2].id).toBe(1003);
      expectControllerState(0, 2, 2, 1, 3);
    });

    it('should hand off requeued order to idle bot when older bot finishes before newer bot', async () => {
      controller.createOrder('Normal');
      controller.createOrder('VIP');
      controller.addBot();

      expect(logs.some(l => l.includes('Bot #1 picked up VIP Order #1002'))).toBe(true);

      await vi.advanceTimersByTimeAsync(5000);

      controller.addBot();
      expect(logs.some(l => l.includes('Bot #2 picked up Normal Order #1001'))).toBe(true);

      await vi.advanceTimersByTimeAsync(5010);
      expect(logs.some(l => l.includes('Bot #1 completed VIP Order #1002'))).toBe(true);
      expect(logs.some(l => l.includes('Bot #1 is now IDLE'))).toBe(true);

      controller.removeBot();
      expect(logs.some(l => l.includes('Bot #2 destroyed while processing Order #1001'))).toBe(true);
      expect(logs.some(l => l.includes('Bot #1 picked up Normal Order #1001'))).toBe(true);

      expect(controller.getPendingOrders().length).toBe(0);
      expect(controller.getStatus().activeBots).toBe(1);
    });

    it('should log timestamps in HH:MM:SS format', async () => {
      controller.addBot();
      controller.createOrder('Normal');
      
      const timestampRegex = /\[\d{2}:\d{2}:\d{2}\]/;
      for (const log of logs) {
        expect(log).toMatch(timestampRegex);
      }
    });
  });

  describe('Stats', () => {
    it('should track order counts correctly', () => {
      controller.createOrder('VIP');
      controller.createOrder('Normal');

      const stats = controller.getStatus();
      expect(stats.totalOrders).toBe(2);
      expect(stats.vipOrders).toBe(1);
      expect(stats.normalOrders).toBe(1);
    });
  });
});
