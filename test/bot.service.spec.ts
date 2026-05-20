import { Test, TestingModule } from '@nestjs/testing';
import { BotService } from '../src/bot/bot.service';
import { OrderService } from '../src/order/order.service';
import { OrderType } from '../src/order/order.types';
import { BotStatus } from '../src/bot/bot.types';

describe('BotService', () => {
  let botService: BotService;
  let orderService: OrderService;

  beforeEach(async () => {
    jest.useFakeTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [BotService, OrderService],
    }).compile();

    botService = module.get<BotService>(BotService);
    orderService = module.get<OrderService>(OrderService);
  });

  afterEach(() => {
    botService.onModuleDestroy();
    jest.useRealTimers();
  });

  describe('addBot', () => {
    it('creates a bot with IDLE status when no orders are pending', () => {
      const b = botService.addBot();
      expect(b.id).toBe(1);
      expect(b.status).toBe(BotStatus.IDLE);
      expect(b.currentOrder).toBeNull();
    });

    it('immediately starts processing when orders exist', () => {
      orderService.createOrder(OrderType.NORMAL);
      botService.addBot();

      const bots = botService.getBots();
      expect(bots[0].status).toBe(BotStatus.PROCESSING);
      expect(bots[0].currentOrder).not.toBeNull();
    });

    it('assigns incrementing IDs across multiple bots', () => {
      const b1 = botService.addBot();
      const b2 = botService.addBot();
      expect(b1.id).toBe(1);
      expect(b2.id).toBe(2);
    });
  });

  describe('order processing (10-second timer)', () => {
    it('completes an order after 10 seconds and moves it to COMPLETE', () => {
      orderService.createOrder(OrderType.NORMAL);
      botService.addBot();

      jest.advanceTimersByTime(10000);

      expect(orderService.getCompletedOrders()).toHaveLength(1);
      expect(orderService.getPendingCount()).toBe(0);
    });

    it('invokes onOrderCompleted callback with correct bot and order info', () => {
      const onCompleted = jest.fn();
      botService.setCallbacks(onCompleted, undefined);

      const o = orderService.createOrder(OrderType.NORMAL);
      botService.addBot();

      jest.advanceTimersByTime(10000);

      expect(onCompleted).toHaveBeenCalledTimes(1);
      expect(onCompleted).toHaveBeenCalledWith(1, expect.objectContaining({ id: o.id }));
    });

    it('invokes onBotIdle callback when no more orders remain', () => {
      const onIdle = jest.fn();
      botService.setCallbacks(undefined, onIdle);

      orderService.createOrder(OrderType.NORMAL);
      botService.addBot();

      jest.advanceTimersByTime(10000);

      expect(onIdle).toHaveBeenCalledWith(1);
    });

    it('processes orders sequentially with a single bot', () => {
      orderService.createOrder(OrderType.NORMAL); // #1
      orderService.createOrder(OrderType.NORMAL); // #2
      botService.addBot();

      expect(orderService.getPendingCount()).toBe(1); // #2 still waiting

      jest.advanceTimersByTime(10000); // complete #1
      expect(orderService.getCompletedOrders()).toHaveLength(1);
      expect(orderService.getPendingCount()).toBe(0); // bot picked #2

      jest.advanceTimersByTime(10000); // complete #2
      expect(orderService.getCompletedOrders()).toHaveLength(2);
    });

    it('processes orders in parallel with multiple bots', () => {
      orderService.createOrder(OrderType.NORMAL); // #1
      orderService.createOrder(OrderType.NORMAL); // #2
      botService.addBot(); // picks #1
      botService.addBot(); // picks #2

      expect(orderService.getPendingCount()).toBe(0);

      jest.advanceTimersByTime(10000); // both complete simultaneously
      expect(orderService.getCompletedOrders()).toHaveLength(2);
    });

    it('picks up VIP orders ahead of Normal orders', () => {
      orderService.createOrder(OrderType.NORMAL); // #1
      orderService.createOrder(OrderType.VIP);    // #2 → front of queue
      botService.addBot();

      const bots = botService.getBots();
      expect(bots[0].currentOrder!.id).toBe(2);
      expect(bots[0].currentOrder!.type).toBe(OrderType.VIP);
    });
  });

  describe('removeLatestBot', () => {
    it('returns null when there are no bots', () => {
      expect(botService.removeLatestBot()).toBeNull();
    });

    it('removes the newest (highest-ID) bot', () => {
      botService.addBot(); // #1
      botService.addBot(); // #2

      const removed = botService.removeLatestBot();
      expect(removed!.id).toBe(2);
      expect(botService.getBotCount()).toBe(1);
    });

    it('stops the processing timer for the removed bot', () => {
      orderService.createOrder(OrderType.NORMAL);
      botService.addBot();
      botService.removeLatestBot();

      jest.advanceTimersByTime(10000);

      // Timer was cancelled; order should NOT appear in completed
      expect(orderService.getCompletedOrders()).toHaveLength(0);
    });

    it('returns the in-progress order back to PENDING', () => {
      orderService.createOrder(OrderType.NORMAL); // #1
      orderService.createOrder(OrderType.NORMAL); // #2
      botService.addBot(); // picks #1
      botService.addBot(); // picks #2

      expect(orderService.getPendingCount()).toBe(0);

      botService.removeLatestBot(); // removes Bot #2, returns Order #2

      expect(orderService.getPendingCount()).toBe(1);
    });

    it('returns removed bot info including the order that was in-flight', () => {
      orderService.createOrder(OrderType.NORMAL);
      botService.addBot();

      const removed = botService.removeLatestBot();
      expect(removed!.currentOrder).not.toBeNull();
      expect(removed!.currentOrder!.id).toBe(1);
    });

    it('returns IDLE bot info with null currentOrder when bot was idle', () => {
      botService.addBot(); // no orders → IDLE

      const removed = botService.removeLatestBot();
      expect(removed!.currentOrder).toBeNull();
    });

    it('re-queues a VIP order before Normal orders when returning to PENDING', () => {
      orderService.createOrder(OrderType.NORMAL); // #1
      orderService.createOrder(OrderType.NORMAL); // #2
      orderService.createOrder(OrderType.VIP);    // #3 → queue front
      // queue: [3(VIP), 1(N), 2(N)]

      botService.addBot(); // Bot #1 picks VIP #3
      botService.addBot(); // Bot #2 picks Normal #1
      // queue: [2(N)]

      botService.removeLatestBot(); // removes Bot #2, returns Normal #1
      // queue: [2(N), 1(N)]

      botService.removeLatestBot(); // removes Bot #1, returns VIP #3
      // queue: [3(VIP), 2(N), 1(N)]

      const q = orderService.getPendingQueue();
      expect(q[0].id).toBe(3);
      expect(q[0].type).toBe(OrderType.VIP);
    });
  });

  describe('notifyNewOrder', () => {
    it('wakes an idle bot when a new order is enqueued', () => {
      botService.addBot(); // no orders → IDLE

      orderService.createOrder(OrderType.NORMAL);
      botService.notifyNewOrder();

      const bots = botService.getBots();
      expect(bots[0].status).toBe(BotStatus.PROCESSING);
      expect(bots[0].currentOrder).not.toBeNull();
    });

    it('does nothing when all bots are already busy', () => {
      orderService.createOrder(OrderType.NORMAL);
      botService.addBot(); // picks the order → PROCESSING

      orderService.createOrder(OrderType.NORMAL); // second order arrives
      botService.notifyNewOrder();                // no idle bots

      // new order still in queue, bot still on original order
      expect(orderService.getPendingCount()).toBe(1);
      expect(botService.getBots()[0].currentOrder!.id).toBe(1);
    });

    it('only wakes one idle bot per call', () => {
      // two idle bots
      botService.addBot();
      botService.addBot();

      orderService.createOrder(OrderType.NORMAL);
      botService.notifyNewOrder(); // should wake exactly one

      const processing = botService.getBots().filter(b => b.status === BotStatus.PROCESSING);
      expect(processing).toHaveLength(1);
    });
  });

  describe('getBotCount', () => {
    it('tracks current number of bots accurately', () => {
      expect(botService.getBotCount()).toBe(0);
      botService.addBot();
      expect(botService.getBotCount()).toBe(1);
      botService.addBot();
      expect(botService.getBotCount()).toBe(2);
      botService.removeLatestBot();
      expect(botService.getBotCount()).toBe(1);
    });
  });
});
