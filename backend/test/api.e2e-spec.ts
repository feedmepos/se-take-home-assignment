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
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

describe('Orders API (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => { app = await makeApp(); });
  afterEach(async () => { await app.close(); });

  it('POST /orders with lowercase type is normalised to VIP → 201', async () => {
    const res = await request(app.getHttpServer())
      .post('/orders')
      .send({ type: 'vip' })
      .expect(201);
    expect(res.body.type).toBe('VIP');
    expect(typeof res.body.id).toBe('number');
  });

  it('POST /orders with invalid type → 400', async () => {
    await request(app.getHttpServer())
      .post('/orders')
      .send({ type: 'bogus' })
      .expect(400);
  });
});

describe('Bots API (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => { app = await makeApp(); });
  afterEach(async () => { await app.close(); });

  it('POST /bots → 201 with numeric id and IDLE status (no pending orders)', async () => {
    const res = await request(app.getHttpServer())
      .post('/bots')
      .expect(201);
    expect(typeof res.body.id).toBe('number');
    expect(res.body.status).toBe('IDLE');
  });

  it('DELETE /bots/:id with unknown id → 404', async () => {
    await request(app.getHttpServer())
      .delete('/bots/9999')
      .expect(404);
  });

  it('DELETE /bots when no bots exist → 404', async () => {
    await request(app.getHttpServer())
      .delete('/bots')
      .expect(404);
  });
});

describe('Status API (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => { app = await makeApp(); });
  afterEach(async () => { await app.close(); });

  it('GET /status → 200 with pending, processing, complete, bots arrays', async () => {
    const res = await request(app.getHttpServer())
      .get('/status')
      .expect(200);
    expect(Array.isArray(res.body.pending)).toBe(true);
    expect(Array.isArray(res.body.processing)).toBe(true);
    expect(Array.isArray(res.body.complete)).toBe(true);
    expect(Array.isArray(res.body.bots)).toBe(true);
  });
});
