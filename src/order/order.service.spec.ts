import { OrderService } from './order.service';
import { LoggerService } from '../logger/logger.service';
import { OrderType } from './order.types';

describe('OrderService', () => {
  let service: OrderService;
  let logger: Pick<LoggerService, 'log'>;

  beforeEach(() => {
    logger = { log: jest.fn() };
    service = new OrderService(logger as LoggerService);
  });

  it('should create orders with increasing IDs', () => {
    const o1 = service.createOrder(OrderType.NORMAL);
    const o2 = service.createOrder(OrderType.NORMAL);
    const o3 = service.createOrder(OrderType.VIP);

    expect(o1.id).toBe(1001);
    expect(o2.id).toBe(1002);
    expect(o3.id).toBe(1003);
  });

  it('should prioritize VIP orders over normal orders', () => {
    // Create some normal orders
    const n1 = service.createOrder(OrderType.NORMAL);
    const n2 = service.createOrder(OrderType.NORMAL);
    // Then a VIP order
    const v1 = service.createOrder(OrderType.VIP);

    const picked1 = service.getNextPendingOrder();
    const picked2 = service.getNextPendingOrder();
    const picked3 = service.getNextPendingOrder();

    // VIP should be picked first
    expect(picked1?.id).toBe(v1.id);
    // Then normal orders in FIFO order
    expect(picked2?.id).toBe(n1.id);
    expect(picked3?.id).toBe(n2.id);
  });

  it('should return processing order back to correct queue', () => {
    const v1 = service.createOrder(OrderType.VIP);
    const n1 = service.createOrder(OrderType.NORMAL);

    const picked1 = service.getNextPendingOrder();
    expect(picked1?.id).toBe(v1.id);

    // Return VIP order back to pending
    if (picked1) {
      service.returnToPending(picked1);
    }

    const pickedAgain = service.getNextPendingOrder();
    // VIP should still be ahead of normal
    expect(pickedAgain?.id).toBe(v1.id);
  });

  it('should report pending orders correctly', () => {
    expect(service.hasPendingOrders()).toBe(false);

    service.createOrder(OrderType.NORMAL);
    expect(service.hasPendingOrders()).toBe(true);

    const picked = service.getNextPendingOrder();
    expect(picked).toBeDefined();
    service.completeOrder(1, picked!);

    expect(service.hasPendingOrders()).toBe(false);
  });
});

