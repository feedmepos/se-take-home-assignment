import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOrder, getOrders, addBot, removeBot, getBots } from '../services/api';

describe('api', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('createOrder', () => {
    it('should POST to /api/orders with type', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ id: 1, type: 'NORMAL', status: 'PENDING', createdAt: 1000 }),
      } as Response);

      const result = await createOrder('NORMAL');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/orders'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ type: 'NORMAL' }),
        }),
      );
      expect(result.id).toBe(1);
    });

    it('should throw on non-ok response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'type must be VIP or NORMAL' }),
      } as Response);

      await expect(createOrder('NORMAL')).rejects.toThrow('type must be VIP or NORMAL');
    });
  });

  describe('getOrders', () => {
    it('should GET /api/orders', async () => {
      const orders = [{ id: 1, type: 'NORMAL', status: 'PENDING', createdAt: 1000 }];
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => orders,
      } as Response);

      const result = await getOrders();

      expect(result).toEqual(orders);
    });
  });

  describe('addBot', () => {
    it('should POST to /api/bots', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ id: 1, name: 'Bot-1', status: 'IDLE' }),
      } as Response);

      const result = await addBot();
      expect(result.name).toBe('Bot-1');
    });
  });

  describe('removeBot', () => {
    it('should DELETE /api/bots', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 204,
      } as Response);

      await removeBot();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/bots'),
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  describe('getBots', () => {
    it('should GET /api/bots', async () => {
      const bots = [{ id: 1, name: 'Bot-1', status: 'IDLE' }];
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => bots,
      } as Response);

      const result = await getBots();
      expect(result).toEqual(bots);
    });
  });
});
