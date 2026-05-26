import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createHealthRouter } from '../health';

describe('GET /health', () => {
  it('returns 200 when the service is ready', async () => {
    const app = express();
    app.use(createHealthRouter());

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
