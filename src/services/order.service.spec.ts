import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { OrderType, OrderStatus } from '../domain/orders/order.entity';
import { InMemoryOrderRepository } from '../infrastructure/repositories/in-memory-order.repository';

describe('OrderService', () => {
  let service: OrderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: 'OrderRepository', useClass: InMemoryOrderRepository },
        OrderService,
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a normal order', () => {
    const order = service.createOrder(OrderType.NORMAL);
    expect(order.type).toBe(OrderType.NORMAL);
    expect(order.status).toBe(OrderStatus.PENDING);
    expect(order.id).toBe(1);
  });

  it('should create a VIP order', () => {
    const order = service.createOrder(OrderType.VIP);
    expect(order.type).toBe(OrderType.VIP);
    expect(order.status).toBe(OrderStatus.PENDING);
    expect(order.id).toBe(1);
  });

  it('should increment order IDs', () => {
    const order1 = service.createOrder(OrderType.NORMAL);
    const order2 = service.createOrder(OrderType.VIP);
    expect(order1.id).toBe(1);
    expect(order2.id).toBe(2);
  });

  it('should return pending orders', () => {
    service.createOrder(OrderType.NORMAL);
    service.createOrder(OrderType.VIP);
    const pendingOrders = service.getPendingOrders();
    expect(pendingOrders).toHaveLength(2);
  });

  it('should prioritize VIP orders over normal orders', () => {
    service.createOrder(OrderType.NORMAL);
    service.createOrder(OrderType.NORMAL);
    service.createOrder(OrderType.VIP);
    
    const nextOrder = service.getNextOrderToProcess();
    expect(nextOrder?.type).toBe(OrderType.VIP);
    expect(nextOrder?.id).toBe(3);
  });

  it('should return normal order when no VIP orders exist', () => {
    service.createOrder(OrderType.NORMAL);
    service.createOrder(OrderType.NORMAL);
    
    const nextOrder = service.getNextOrderToProcess();
    expect(nextOrder?.type).toBe(OrderType.NORMAL);
    expect(nextOrder?.id).toBe(1);
  });

  it('should return null when no pending orders exist', () => {
    const nextOrder = service.getNextOrderToProcess();
    expect(nextOrder).toBeNull();
  });

  it('should start processing an order', () => {
    const order = service.createOrder(OrderType.NORMAL);
    const result = service.startProcessingOrder(order.id);
    
    expect(result).toBe(true);
    expect(order.status).toBe(OrderStatus.PROCESSING);
    expect(order.processingStartedAt).toBeDefined();
  });

  it('should complete an order', () => {
    const order = service.createOrder(OrderType.NORMAL);
    service.startProcessingOrder(order.id);
    const result = service.completeOrder(order.id);
    
    expect(result).toBe(true);
    expect(order.status).toBe(OrderStatus.COMPLETE);
    expect(order.completedAt).toBeDefined();
  });

  it('should reset order to pending', () => {
    const order = service.createOrder(OrderType.NORMAL);
    service.startProcessingOrder(order.id);
    const result = service.resetOrderToPending(order.id);
    
    expect(result).toBe(true);
    expect(order.status).toBe(OrderStatus.PENDING);
    expect(order.processingStartedAt).toBeUndefined();
  });

  it('should return correct order stats', () => {
    service.createOrder(OrderType.NORMAL);
    service.createOrder(OrderType.VIP);
    const order = service.createOrder(OrderType.NORMAL);
    service.startProcessingOrder(order.id);
    
    const stats = service.getOrderStats();
    expect(stats.total).toBe(3);
    expect(stats.pending).toBe(2);
    expect(stats.processing).toBe(1);
    expect(stats.complete).toBe(0);
  });
});
