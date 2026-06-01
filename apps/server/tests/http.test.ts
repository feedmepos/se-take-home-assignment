import { describe, it, expect } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerHttpRoutes } from '../src/interface/http/routes';
import { KitchenService } from '../src/application/KitchenService';
import { FakeClock } from '@feedme/core';

function buildTestApp(): { app: FastifyInstance; service: KitchenService } {
  const app = Fastify();
  const service = new KitchenService(new FakeClock());
  registerHttpRoutes(app, service);
  return { app, service };
}

describe('HTTP routes', () => {
  it('GET /api/state returns an empty initial snapshot', async () => {
    const { app } = buildTestApp();
    const res = await app.inject({ method: 'GET', url: '/api/state' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ pending: [], processing: [], complete: [], bots: [] });
  });

  it('POST /api/orders creates a VIP order shown in pending', async () => {
    const { app } = buildTestApp();
    const res = await app.inject({ method: 'POST', url: '/api/orders', payload: { type: 'VIP' } });
    expect(res.statusCode).toBe(200);
    expect(res.json().state.pending[0].type).toBe('VIP');
  });

  it('POST /api/orders rejects an invalid type with 400', async () => {
    const { app } = buildTestApp();
    const res = await app.inject({ method: 'POST', url: '/api/orders', payload: { type: 'GOLD' } });
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/bots adds a bot', async () => {
    const { app } = buildTestApp();
    const res = await app.inject({ method: 'POST', url: '/api/bots' });
    expect(res.statusCode).toBe(200);
    expect(res.json().state.bots).toHaveLength(1);
  });

  it('DELETE /api/bots removes the newest bot', async () => {
    const { app } = buildTestApp();
    await app.inject({ method: 'POST', url: '/api/bots' });
    const res = await app.inject({ method: 'DELETE', url: '/api/bots' });
    expect(res.statusCode).toBe(200);
    expect(res.json().state.bots).toHaveLength(0);
  });
});
