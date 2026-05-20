import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from '../src/order/order.service';
import { OrderType, OrderStatus } from '../src/order/order.types';

describe('OrderService', () => {
  let service: OrderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderService],
    }).compile();
    service = module.get<OrderService>(OrderService);
  });

  describe('createOrder', () => {
    it('assigns unique, incrementing IDs', () => {
      const a = service.createOrder(OrderType.NORMAL);
      const b = service.createOrder(OrderType.NORMAL);
      expect(a.id).toBe(1);
      expect(b.id).toBe(2);
    });

    it('creates a Normal order with PENDING status', () => {
      const o = service.createOrder(OrderType.NORMAL);
      expect(o.type).toBe(OrderType.NORMAL);
      expect(o.status).toBe(OrderStatus.PENDING);
      expect(o.createdAt).toBeInstanceOf(Date);
    });

    it('creates a VIP order with PENDING status', () => {
      const o = service.createOrder(OrderType.VIP);
      expect(o.type).toBe(OrderType.VIP);
      expect(o.status).toBe(OrderStatus.PENDING);
    });

    it('places VIP order in front of all existing Normal orders', () => {
      service.createOrder(OrderType.NORMAL); // #1
      service.createOrder(OrderType.NORMAL); // #2
      service.createOrder(OrderType.VIP);    // #3 → should be index 0

      const q = service.getPendingQueue();
      expect(q[0].id).toBe(3);
      expect(q[0].type).toBe(OrderType.VIP);
      expect(q[1].type).toBe(OrderType.NORMAL);
      expect(q[2].type).toBe(OrderType.NORMAL);
    });

    it('places a second VIP order behind the first VIP order but before Normal orders', () => {
      service.createOrder(OrderType.VIP);    // #1 — first VIP
      service.createOrder(OrderType.NORMAL); // #2
      service.createOrder(OrderType.VIP);    // #3 — second VIP

      const q = service.getPendingQueue();
      expect(q[0].id).toBe(1); // first VIP
      expect(q[1].id).toBe(3); // second VIP
      expect(q[2].id).toBe(2); // Normal
    });

    it('appends Normal orders at the end of the queue', () => {
      service.createOrder(OrderType.NORMAL); // #1
      service.createOrder(OrderType.VIP);    // #2
      service.createOrder(OrderType.NORMAL); // #3 → end

      const q = service.getPendingQueue();
      expect(q[q.length - 1].id).toBe(3);
    });
  });

  describe('getNextPendingOrder', () => {
    it('returns null when the queue is empty', () => {
      expect(service.getNextPendingOrder()).toBeNull();
    });

    it('dequeues the first order and marks it PROCESSING', () => {
      service.createOrder(OrderType.NORMAL);
      service.createOrder(OrderType.NORMAL);

      const o = service.getNextPendingOrder();
      expect(o).not.toBeNull();
      expect(o!.status).toBe(OrderStatus.PROCESSING);
      expect(service.getPendingCount()).toBe(1);
    });

    it('returns the VIP order ahead of Normal orders', () => {
      service.createOrder(OrderType.NORMAL); // #1
      service.createOrder(OrderType.VIP);    // #2 → queue front

      const o = service.getNextPendingOrder();
      expect(o!.id).toBe(2);
      expect(o!.type).toBe(OrderType.VIP);
    });
  });

  describe('completeOrder', () => {
    it('marks order COMPLETE, stamps completedAt, and adds to completed list', () => {
      service.createOrder(OrderType.NORMAL);
      const o = service.getNextPendingOrder()!;

      service.completeOrder(o);

      expect(o.status).toBe(OrderStatus.COMPLETE);
      expect(o.completedAt).toBeInstanceOf(Date);
      expect(service.getCompletedOrders()).toHaveLength(1);
      expect(service.getCompletedOrders()[0].id).toBe(o.id);
    });
  });

  describe('returnOrderToPending', () => {
    it('returns a VIP order to the front (before Normal orders)', () => {
      service.createOrder(OrderType.NORMAL); // #1
      service.createOrder(OrderType.NORMAL); // #2
      const vip = service.createOrder(OrderType.VIP); // #3 → queue front

      const picked = service.getNextPendingOrder()!;
      expect(picked.id).toBe(3);

      service.returnOrderToPending(picked);

      const q = service.getPendingQueue();
      expect(q[0].id).toBe(3);
      expect(q[0].type).toBe(OrderType.VIP);
    });

    it('returns a Normal order to the end of the queue', () => {
      service.createOrder(OrderType.NORMAL); // #1
      service.createOrder(OrderType.NORMAL); // #2

      const picked = service.getNextPendingOrder()!; // #1
      service.returnOrderToPending(picked);

      const q = service.getPendingQueue();
      expect(q[q.length - 1].id).toBe(1);
    });

    it('preserves relative VIP ordering when returning a VIP order', () => {
      service.createOrder(OrderType.VIP);    // #1
      service.createOrder(OrderType.VIP);    // #2
      service.createOrder(OrderType.NORMAL); // #3

      service.getNextPendingOrder(); // dequeue #1
      const second = service.getNextPendingOrder()!; // dequeue #2

      // Queue now: [#3(N)]
      service.returnOrderToPending(second); // VIP #2 returns → in front of normals

      const q = service.getPendingQueue();
      expect(q[0].id).toBe(2);
      expect(q[0].type).toBe(OrderType.VIP);
      expect(q[1].type).toBe(OrderType.NORMAL);
    });
  });

  describe('getPendingCount', () => {
    it('reflects queue length accurately', () => {
      expect(service.getPendingCount()).toBe(0);
      service.createOrder(OrderType.NORMAL);
      expect(service.getPendingCount()).toBe(1);
      service.createOrder(OrderType.VIP);
      expect(service.getPendingCount()).toBe(2);
      service.getNextPendingOrder();
      expect(service.getPendingCount()).toBe(1);
    });
  });
});
