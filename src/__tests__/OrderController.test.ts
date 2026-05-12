import { OrderController } from '../OrderController';
import { OrderType, OrderStatus, BotStatus } from '../types';

// Helper: create a controller with a mock logger
function createController() {
  const logs: string[] = [];
  const logger = { log: (msg: string) => logs.push(msg) };
  const controller = new OrderController(logger);
  return { controller, logs, logger };
}

// Helper: wait for ms
const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

describe('OrderController', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Order creation', () => {
    it('should create a normal order', () => {
      const { controller, logs } = createController();
      const order = controller.createNormalOrder();

      expect(order.type).toBe(OrderType.NORMAL);
      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.id).toBe(1001);
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should create a VIP order', () => {
      const { controller } = createController();
      const order = controller.createVIPOrder();

      expect(order.type).toBe(OrderType.VIP);
      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.id).toBe(1001);
    });

    it('should increment order IDs', () => {
      const { controller } = createController();
      const o1 = controller.createNormalOrder();
      const o2 = controller.createVIPOrder();
      const o3 = controller.createNormalOrder();

      expect(o1.id).toBe(1001);
      expect(o2.id).toBe(1002);
      expect(o3.id).toBe(1003);
    });
  });

  describe('Bot management', () => {
    it('should add a bot', () => {
      const { controller } = createController();
      const bot = controller.addBot();

      expect(bot.id).toBe(1);
      expect(controller.getBotCount()).toBe(1);
    });

    it('should increment bot IDs', () => {
      const { controller } = createController();
      const b1 = controller.addBot();
      const b2 = controller.addBot();

      expect(b1.id).toBe(1);
      expect(b2.id).toBe(2);
      expect(controller.getBotCount()).toBe(2);
    });

    it('should remove the newest bot', () => {
      const { controller } = createController();
      controller.addBot();
      controller.addBot();
      controller.addBot();

      expect(controller.getBotCount()).toBe(3);
      controller.removeBot();
      expect(controller.getBotCount()).toBe(2);
    });

    it('should return null when removing with no bots', () => {
      const { controller } = createController();
      const result = controller.removeBot();
      expect(result).toBeNull();
    });
  });

  describe('Order processing', () => {
    it('should auto-assign pending orders to idle bots', () => {
      const { controller } = createController();

      controller.createNormalOrder();
      controller.createNormalOrder();
      controller.addBot(); // Should pick up first order

      const status = controller.getStatus();
      expect(status.processingOrders.length).toBe(1);
      expect(status.pendingOrders.length).toBe(1);
    });

    it('should prioritize VIP orders', () => {
      const { controller } = createController();

      controller.createNormalOrder(); // #1001
      controller.createNormalOrder(); // #1002
      controller.createVIPOrder();    // #1003
      controller.addBot();            // Should pick up VIP #1003

      const status = controller.getStatus();
      expect(status.processingOrders[0].order.id).toBe(1003);
      expect(status.processingOrders[0].order.type).toBe(OrderType.VIP);
    });

    it('should complete order after 10 seconds', () => {
      const { controller } = createController();

      controller.createNormalOrder();
      controller.addBot();

      // Before 10s
      expect(controller.getCompletedCount()).toBe(0);

      // Advance 10 seconds
      jest.advanceTimersByTime(10000);

      expect(controller.getCompletedCount()).toBe(1);
    });

    it('should process next order after completing one', () => {
      const { controller } = createController();

      controller.createNormalOrder(); // #1001
      controller.createNormalOrder(); // #1002
      controller.addBot();

      // First order processing
      let status = controller.getStatus();
      expect(status.processingOrders[0].order.id).toBe(1001);

      // After 10s, first should be complete, second should start
      jest.advanceTimersByTime(10000);

      status = controller.getStatus();
      expect(status.completedOrders.length).toBe(1);
      expect(status.completedOrders[0].id).toBe(1001);
      expect(status.processingOrders.length).toBe(1);
      expect(status.processingOrders[0].order.id).toBe(1002);
    });

    it('bot should be idle when no pending orders', () => {
      const { controller } = createController();

      controller.createNormalOrder();
      controller.addBot();

      jest.advanceTimersByTime(10000);

      const status = controller.getStatus();
      expect(status.pendingOrders.length).toBe(0);
      expect(status.processingOrders.length).toBe(0);
      expect(status.bots[0].status).toBe(BotStatus.IDLE);
    });

    it('idle bot should pick up new order immediately', () => {
      const { controller } = createController();

      controller.addBot(); // Bot is idle

      const status1 = controller.getStatus();
      expect(status1.bots[0].status).toBe(BotStatus.IDLE);

      controller.createNormalOrder(); // Should be picked up immediately

      const status2 = controller.getStatus();
      expect(status2.processingOrders.length).toBe(1);
    });
  });

  describe('Bot removal with processing order', () => {
    it('should return processing order to PENDING when bot is removed', () => {
      const { controller } = createController();

      controller.createNormalOrder(); // #1001
      controller.addBot();            // Bot #1 picks up #1001

      // Remove bot while processing
      controller.removeBot();

      const status = controller.getStatus();
      expect(status.bots.length).toBe(0);
      expect(status.pendingOrders.length).toBe(1);
      expect(status.pendingOrders[0].id).toBe(1001);
      expect(status.pendingOrders[0].status).toBe(OrderStatus.PENDING);
    });

    it('should maintain VIP priority when order is returned to queue', () => {
      const { controller } = createController();

      controller.createNormalOrder(); // #1001
      controller.createVIPOrder();    // #1002
      controller.addBot();            // Picks VIP #1002
      controller.addBot();            // Picks Normal #1001

      // Remove bot #2 (processing #1001) - order returns to queue
      controller.removeBot();

      const status = controller.getStatus();
      expect(status.processingOrders.length).toBe(1); // Bot #1 still processing
      expect(status.processingOrders[0].order.id).toBe(1002); // VIP
      expect(status.pendingOrders.length).toBe(1);
      expect(status.pendingOrders[0].id).toBe(1001);
    });

    it('should not complete order when bot is removed during processing', () => {
      const { controller } = createController();

      controller.createNormalOrder();
      controller.addBot();

      // Remove bot before 10s
      controller.removeBot();

      // Advance past 10s
      jest.advanceTimersByTime(15000);

      // Order should still be pending, not completed
      expect(controller.getCompletedCount()).toBe(0);
    });
  });

  describe('Multiple bots scenario', () => {
    it('should distribute orders across multiple bots', () => {
      const { controller } = createController();

      controller.createNormalOrder();
      controller.createNormalOrder();
      controller.createNormalOrder();
      controller.addBot();
      controller.addBot();

      const status = controller.getStatus();
      expect(status.processingOrders.length).toBe(2);
      expect(status.pendingOrders.length).toBe(1);
    });

    it('should complete all orders with enough bots', () => {
      const { controller } = createController();

      controller.createNormalOrder();
      controller.createNormalOrder();
      controller.addBot();
      controller.addBot();

      jest.advanceTimersByTime(10000);

      const status = controller.getStatus();
      expect(status.completedOrders.length).toBe(2);
      expect(status.pendingOrders.length).toBe(0);
      expect(status.processingOrders.length).toBe(0);
    });
  });

  describe('getStatus', () => {
    it('should return correct status structure', () => {
      const { controller } = createController();

      controller.createNormalOrder();
      controller.createVIPOrder();
      controller.addBot();

      const status = controller.getStatus();

      expect(status).toHaveProperty('pendingOrders');
      expect(status).toHaveProperty('processingOrders');
      expect(status).toHaveProperty('completedOrders');
      expect(status).toHaveProperty('bots');
    });
  });

  describe('printStatus', () => {
    it('should output status to logger', () => {
      const { controller, logs } = createController();

      controller.createNormalOrder();
      controller.addBot();
      controller.printStatus();

      // Should have logged status info
      const statusLogs = logs.join('\n');
      expect(statusLogs).toContain('Current Status');
    });
  });
});
