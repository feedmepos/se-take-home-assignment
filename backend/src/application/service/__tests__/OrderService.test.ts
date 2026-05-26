import { describe, it, expect, vi } from 'vitest';
import { OrderService } from '../OrderService';
import { OrderProcessingEngine } from '../../../domain/service/OrderProcessingEngine';
import { Order } from '../../../domain/model/Order';

describe('OrderService', () => {
  it('should create order and return JSON', () => {
    const engine = new OrderProcessingEngine();
    const service = new OrderService(engine);

    const result = service.createOrder('VIP');

    expect(result.id).toBe(1);
    expect(result.type).toBe('VIP');
    expect(result.status).toBe('PENDING');
    expect(result.createdAt).toBeGreaterThan(0);
  });

  it('should get all orders as JSON', () => {
    const engine = new OrderProcessingEngine();
    const service = new OrderService(engine);

    service.createOrder('NORMAL');
    service.createOrder('VIP');

    const orders = service.getOrders();
    expect(orders.length).toBe(2);
    expect(orders[0].type).toBe('VIP');
    expect(orders[1].type).toBe('NORMAL');
  });

  it('should delegate to engine methods', () => {
    const mockEngine = {
      createOrder: vi.fn().mockReturnValue(new Order(1, 'NORMAL')),
      getOrders: vi.fn().mockReturnValue([]),
    } as unknown as OrderProcessingEngine;

    const service = new OrderService(mockEngine);
    service.createOrder('NORMAL');

    expect(mockEngine.createOrder).toHaveBeenCalledWith('NORMAL');
  });
});
