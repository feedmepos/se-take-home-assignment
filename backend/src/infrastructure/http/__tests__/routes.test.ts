import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createRouter } from '../routes';
import type { OrderService } from '../../../application/service/OrderService';
import type { BotService } from '../../../application/service/BotService';

function createTestApp(orderService: OrderService, botService: BotService) {
  const app = express();
  app.use(express.json());
  app.use(createRouter(orderService, botService));
  return app;
}

describe('REST Routes', () => {
  describe('POST /api/orders', () => {
    it('should create order and return 201', async () => {
      const mockOrderService = {
        createOrder: vi.fn().mockReturnValue({ id: 1, type: 'NORMAL', status: 'PENDING', createdAt: 1000 }),
        getOrders: vi.fn(),
      } as unknown as OrderService;
      const mockBotService = { addBot: vi.fn(), removeBot: vi.fn(), getBots: vi.fn() } as unknown as BotService;

      const res = await request(createTestApp(mockOrderService, mockBotService))
        .post('/api/orders')
        .send({ type: 'NORMAL' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe(1);
      expect(mockOrderService.createOrder).toHaveBeenCalledWith('NORMAL');
    });

    it('should reject invalid order type', async () => {
      const mockOrderService = {
        createOrder: vi.fn(),
        getOrders: vi.fn(),
      } as unknown as OrderService;
      const mockBotService = { addBot: vi.fn(), removeBot: vi.fn(), getBots: vi.fn() } as unknown as BotService;

      const res = await request(createTestApp(mockOrderService, mockBotService))
        .post('/api/orders')
        .send({ type: 'INVALID' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/orders', () => {
    it('should return all orders', async () => {
      const orders = [{ id: 1, type: 'NORMAL', status: 'PENDING', createdAt: 1000 }];
      const mockOrderService = {
        createOrder: vi.fn(),
        getOrders: vi.fn().mockReturnValue(orders),
      } as unknown as OrderService;
      const mockBotService = { addBot: vi.fn(), removeBot: vi.fn(), getBots: vi.fn() } as unknown as BotService;

      const res = await request(createTestApp(mockOrderService, mockBotService))
        .get('/api/orders');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(orders);
    });
  });

  describe('POST /api/bots', () => {
    it('should create bot and return 201', async () => {
      const mockOrderService = { createOrder: vi.fn(), getOrders: vi.fn() } as unknown as OrderService;
      const mockBotService = {
        addBot: vi.fn().mockReturnValue({ id: 1, name: 'Bot-1', status: 'IDLE' }),
        removeBot: vi.fn(),
        getBots: vi.fn(),
      } as unknown as BotService;

      const res = await request(createTestApp(mockOrderService, mockBotService))
        .post('/api/bots');

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Bot-1');
      expect(mockBotService.addBot).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/bots', () => {
    it('should remove bot and return 204', async () => {
      const mockOrderService = { createOrder: vi.fn(), getOrders: vi.fn() } as unknown as OrderService;
      const mockBotService = {
        addBot: vi.fn(),
        removeBot: vi.fn(),
        getBots: vi.fn(),
      } as unknown as BotService;

      const res = await request(createTestApp(mockOrderService, mockBotService))
        .delete('/api/bots');

      expect(res.status).toBe(204);
      expect(mockBotService.removeBot).toHaveBeenCalled();
    });
  });

  describe('GET /api/bots', () => {
    it('should return all bots', async () => {
      const bots = [{ id: 1, name: 'Bot-1', status: 'IDLE' }];
      const mockOrderService = { createOrder: vi.fn(), getOrders: vi.fn() } as unknown as OrderService;
      const mockBotService = {
        addBot: vi.fn(),
        removeBot: vi.fn(),
        getBots: vi.fn().mockReturnValue(bots),
      } as unknown as BotService;

      const res = await request(createTestApp(mockOrderService, mockBotService))
        .get('/api/bots');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(bots);
    });
  });
});
