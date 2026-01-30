import { OrderService } from '../order.service';
import { LoggerService } from '../../logger/logger.service';
import { OrderType } from '../order.types';

describe('OrderService', () => {
  let service: OrderService;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(() => {
    logger = {
      log: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;

    service = new OrderService(logger);
  });

  it('creates NORMAL order and puts it in normal queue', () => {
    const order = service.createOrder(OrderType.NORMAL);

    expect(order.id).toBe(1001);
    expect(order.type).toBe(OrderType.NORMAL);
    expect(order.status).toBe('PENDING');

    const pending = service.getPending();
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe(order.id);
  });

  it('creates VIP order and puts it in VIP queue', () => {
    const order = service.createOrder(OrderType.VIP);

    expect(order.type).toBe(OrderType.VIP);

    const pending = service.getPending();
    expect(pending).toHaveLength(1);
    expect(pending[0].type).toBe(OrderType.VIP);
  });

  it('returns VIP order before NORMAL order', () => {
    const normal = service.createOrder(OrderType.NORMAL);
    const vip = service.createOrder(OrderType.VIP);

    const next = service.getNextPendingOrder();

    expect(next?.id).toBe(vip.id);
    expect(next?.status).toBe('PROCESSING');
    expect(next?.startedAt).toBeDefined();
  });

  it('returns NORMAL order when no VIP exists', () => {
    const normal = service.createOrder(OrderType.NORMAL);

    const next = service.getNextPendingOrder();

    expect(next?.id).toBe(normal.id);
  });

  it('returns order back to pending queue', () => {
    const order = service.createOrder(OrderType.NORMAL);
    const processing = service.getNextPendingOrder()!;

    service.returnToPending(processing);

    const pending = service.getPending();
    expect(pending).toHaveLength(1);
    expect(pending[0].status).toBe('PENDING');
  });

  it('completes an order correctly', () => {
    const order = service.createOrder(OrderType.NORMAL);
    const processing = service.getNextPendingOrder()!;

    service.completeOrder(1, processing);

    const completed = service.getCompleted();
    expect(completed).toHaveLength(1);
    expect(completed[0].status).toBe('COMPLETE');
    expect(completed[0].completedAt).toBeDefined();
  });

  it('hasPendingOrders returns true when queues not empty', () => {
    service.createOrder(OrderType.NORMAL);

    expect(service.hasPendingOrders()).toBe(true);
  });

  it('hasPendingOrders returns false when queues empty', () => {
    expect(service.hasPendingOrders()).toBe(false);
  });
});
