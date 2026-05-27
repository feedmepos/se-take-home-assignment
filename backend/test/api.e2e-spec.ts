import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

async function makeApp(): Promise<INestApplication<App>> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

describe('Orders API (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => { app = await makeApp(); });
  afterEach(async () => { await app.close(); });

  it('POST /api/orders with lowercase type is normalised to VIP → 201', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/orders')
      .send({ type: 'vip' })
      .expect(201);
    expect(res.body.type).toBe('VIP');
    expect(typeof res.body.id).toBe('number');
  });

  it('POST /api/orders with invalid type → 400', async () => {
    await request(app.getHttpServer())
      .post('/api/orders')
      .send({ type: 'bogus' })
      .expect(400);
  });

  it('GET /api/orders?type=vip → 200 and only VIP orders', async () => {
    await request(app.getHttpServer()).post('/api/orders').send({ type: 'vip' }).expect(201);
    await request(app.getHttpServer()).post('/api/orders').send({ type: 'normal' }).expect(201);
    const res = await request(app.getHttpServer())
      .get('/api/orders?type=vip')
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((o: { type: string }) => o.type === 'VIP')).toBe(true);
  });

  it('GET /api/orders?type=bogus → 400', async () => {
    await request(app.getHttpServer())
      .get('/api/orders?type=bogus')
      .expect(400);
  });
});

describe('Bots API (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => { app = await makeApp(); });
  afterEach(async () => { await app.close(); });

  it('POST /api/bots → 201 with numeric id and IDLE status (no pending orders)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/bots')
      .expect(201);
    expect(typeof res.body.id).toBe('number');
    expect(res.body.status).toBe('IDLE');
  });

  it('DELETE /api/bots/:id with unknown id → 404', async () => {
    await request(app.getHttpServer())
      .delete('/api/bots/9999')
      .expect(404);
  });

  it('DELETE /api/bots when no bots exist → 404', async () => {
    await request(app.getHttpServer())
      .delete('/api/bots')
      .expect(404);
  });
});

describe('Status API (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => { app = await makeApp(); });
  afterEach(async () => { await app.close(); });

  it('GET /api/status → 200 with pending, processing, complete, bots arrays', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/status')
      .expect(200);
    expect(Array.isArray(res.body.pending)).toBe(true);
    expect(Array.isArray(res.body.processing)).toBe(true);
    expect(Array.isArray(res.body.complete)).toBe(true);
    expect(Array.isArray(res.body.bots)).toBe(true);
  });

  it('GET /api/health → 200 with { status: ok }', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
