const OrderController = require('../src/controllers/order-controller');

const STARTING_ORDER_ID = 1001;

describe('OrderController', () => {
  let controller;

  beforeEach(() => {
    jest.useFakeTimers();
    controller = new OrderController({ processingTime: 10000 });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ─── Order Management ───────────────────────────────────────────────

  describe('Order Management', () => {
    test('should create a normal order with PENDING status', () => {
      const order = controller.addOrder('Normal');
      expect(order.id).toBe(STARTING_ORDER_ID);
      expect(order.type).toBe('Normal');
      expect(order.status).toBe('PENDING');
    });

    test('should create a VIP order with PENDING status', () => {
      const order = controller.addOrder('VIP');
      expect(order.id).toBe(STARTING_ORDER_ID);
      expect(order.type).toBe('VIP');
      expect(order.status).toBe('PENDING');
    });

    test('should generate unique increasing order IDs', () => {
      const o1 = controller.addOrder('Normal');
      const o2 = controller.addOrder('VIP');
      const o3 = controller.addOrder('Normal');
      expect(o1.id).toBe(STARTING_ORDER_ID);
      expect(o2.id).toBe(STARTING_ORDER_ID + 1);
      expect(o3.id).toBe(STARTING_ORDER_ID + 2);
    });

    test('VIP orders should be placed before normal orders', () => {
      controller.addOrder('Normal'); // #1
      controller.addOrder('Normal'); // #2
      controller.addOrder('VIP'); // #3

      expect(controller.pendingOrders.map((o) => o.id)).toEqual([
        STARTING_ORDER_ID + 2,
        STARTING_ORDER_ID,
        STARTING_ORDER_ID + 1,
      ]);
    });

    test('VIP orders should queue behind existing VIP orders', () => {
      controller.addOrder('Normal'); // #1
      controller.addOrder('VIP'); // #2
      controller.addOrder('Normal'); // #3
      controller.addOrder('VIP'); // #4

      expect(controller.pendingOrders.map((o) => o.id)).toEqual([
        STARTING_ORDER_ID + 1,
        STARTING_ORDER_ID + 3,
        STARTING_ORDER_ID,
        STARTING_ORDER_ID + 2,
      ]);
    });
  });

  // ─── Bot Management ─────────────────────────────────────────────────

  describe('Bot Management', () => {
    test('should create a bot and add it to the list', () => {
      const bot = controller.addBot();
      expect(bot.id).toBe(1);
      expect(controller.bots).toHaveLength(1);
    });

    test('bot should immediately process a pending order', () => {
      controller.addOrder('Normal');
      const bot = controller.addBot();

      expect(bot.currentOrder).not.toBeNull();
      expect(bot.currentOrder.id).toBe(STARTING_ORDER_ID);
      expect(bot.currentOrder.status).toBe('PROCESSING');
      expect(controller.pendingOrders).toHaveLength(0);
    });

    test('bot should complete order after 10 seconds', () => {
      controller.addOrder('Normal');
      controller.addBot();

      jest.advanceTimersByTime(10000);

      expect(controller.completedOrders).toHaveLength(1);
      expect(controller.completedOrders[0].status).toBe('COMPLETE');
    });

    test('bot should pick up VIP order before normal order', () => {
      controller.addOrder('Normal'); // #1
      controller.addOrder('VIP'); // #2

      const bot = controller.addBot();
      expect(bot.currentOrder.id).toBe(STARTING_ORDER_ID + 1);
    });

    test('bot should become idle when no pending orders remain', () => {
      controller.addOrder('Normal');
      const bot = controller.addBot();

      jest.advanceTimersByTime(10000);

      expect(bot.isIdle).toBe(true);
      expect(bot.currentOrder).toBeNull();
    });

    test('idle bot should pick up a new order immediately', () => {
      const bot = controller.addBot();
      expect(bot.isIdle).toBe(true);

      controller.addOrder('Normal');

      expect(bot.isIdle).toBe(false);
      expect(bot.currentOrder.id).toBe(STARTING_ORDER_ID);
    });

    test('bot should process the next order after completing the current one', () => {
      controller.addOrder('Normal'); // #1
      controller.addOrder('Normal'); // #2
      const bot = controller.addBot();

      expect(bot.currentOrder.id).toBe(STARTING_ORDER_ID);

      jest.advanceTimersByTime(10000);

      expect(controller.completedOrders).toHaveLength(1);
      expect(bot.currentOrder.id).toBe(STARTING_ORDER_ID + 1);

      jest.advanceTimersByTime(10000);

      expect(controller.completedOrders).toHaveLength(2);
      expect(bot.isIdle).toBe(true);
    });
  });

  // ─── Bot Removal ────────────────────────────────────────────────────

  describe('Bot Removal', () => {
    test('should remove the newest (last added) bot', () => {
      controller.addBot(); // #1
      controller.addBot(); // #2

      controller.removeBot();

      expect(controller.bots).toHaveLength(1);
      expect(controller.bots[0].id).toBe(1);
    });

    test('should return order to pending when bot removed while processing', () => {
      controller.addOrder('Normal');
      controller.addBot();

      expect(controller.pendingOrders).toHaveLength(0);

      controller.removeBot();

      expect(controller.pendingOrders).toHaveLength(1);
      expect(controller.pendingOrders[0].id).toBe(STARTING_ORDER_ID);
      expect(controller.pendingOrders[0].status).toBe('PENDING');
    });

    test('returned order should maintain correct priority position', () => {
      controller.addOrder('Normal'); // #1
      controller.addOrder('VIP'); // #2
      controller.addOrder('Normal'); // #3
      controller.addBot(); // Bot #1 → picks VIP #2
      controller.addBot(); // Bot #2 → picks Normal #1

      // pending: [N3]
      controller.removeBot(); // Remove Bot #2 → N1 returns

      expect(controller.pendingOrders.map((o) => o.id)).toEqual([
        STARTING_ORDER_ID,
        STARTING_ORDER_ID + 2,
      ]);
    });

    test('should do nothing when no bots exist', () => {
      const result = controller.removeBot();
      expect(result).toBeNull();
    });

    test('removed bot should not complete its order', () => {
      controller.addOrder('Normal');
      controller.addBot();

      controller.removeBot();
      jest.advanceTimersByTime(10000);

      expect(controller.completedOrders).toHaveLength(0);
      expect(controller.pendingOrders).toHaveLength(1);
    });

    test('returned VIP order should go before normal orders in pending', () => {
      controller.addOrder('Normal'); // #1
      controller.addOrder('VIP'); // #2
      controller.addBot(); // Bot #1 → picks VIP #2

      controller.removeBot(); // VIP #2 returns

      expect(controller.pendingOrders.map((o) => o.id)).toEqual([
        STARTING_ORDER_ID + 1,
        STARTING_ORDER_ID,
      ]);
      expect(controller.pendingOrders[0].type).toBe('VIP');
    });
  });

  // ─── Multiple Bots ──────────────────────────────────────────────────

  describe('Multiple Bots', () => {
    test('multiple bots should process orders concurrently', () => {
      controller.addOrder('Normal'); // #1
      controller.addOrder('Normal'); // #2
      controller.addBot();
      controller.addBot();

      jest.advanceTimersByTime(10000);

      expect(controller.completedOrders).toHaveLength(2);
    });

    test('extra bots should idle when there are fewer orders than bots', () => {
      controller.addOrder('Normal');
      controller.addBot();
      controller.addBot();
      controller.addBot();

      const status = controller.getStatus();
      const active = status.bots.filter((b) => b.status === 'ACTIVE');
      const idle = status.bots.filter((b) => b.status === 'IDLE');

      expect(active).toHaveLength(1);
      expect(idle).toHaveLength(2);
    });

    test('idle bot should pick up returned order after bot removal', () => {
      controller.addOrder('Normal'); // #1
      controller.addOrder('Normal'); // #2
      controller.addBot(); // Bot #1 → N1
      controller.addBot(); // Bot #2 → N2

      jest.advanceTimersByTime(10000);
      // Both complete; both bots idle now

      controller.addOrder('Normal'); // #3 → Bot #1 picks it
      controller.addOrder('Normal'); // #4 → Bot #2 picks it

      controller.removeBot(); // Remove Bot #2 → N4 returns to pending
      // Bot #1 is busy, so N4 stays pending

      jest.advanceTimersByTime(10000);
      // Bot #1 completes #3, picks #4

      expect(controller.completedOrders).toHaveLength(3);
      expect(controller.bots[0].currentOrder.id).toBe(STARTING_ORDER_ID + 3);

      jest.advanceTimersByTime(10000);

      expect(controller.completedOrders).toHaveLength(4);
    });
  });

  // ─── Status ─────────────────────────────────────────────────────────

  describe('getStatus', () => {
    test('should return correct status summary', () => {
      controller.addOrder('Normal');
      controller.addOrder('VIP');
      controller.addBot();

      const status = controller.getStatus();

      expect(status.totalBots).toBe(1);
      expect(status.totalPending).toBe(1);
      expect(status.totalCompleted).toBe(0);
      expect(status.bots[0].status).toBe('ACTIVE');
      expect(status.bots[0].currentOrder).toBe(STARTING_ORDER_ID + 1);
    });
  });
});
