#!/usr/bin/env node

const path = require('node:path');
const { createRequire } = require('node:module');

const backendRequire = createRequire(path.join(__dirname, '..', 'backend', 'package.json'));
const { OrderController, DEFAULT_COOK_MS } = backendRequire('./dist/domain/order-controller');
const { FakeClock } = backendRequire('./dist/domain/time.fake');
const { NestFactory } = backendRequire('@nestjs/core');
const { ValidationPipe } = backendRequire('@nestjs/common');
const { AppModule } = backendRequire('./dist/app.module');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function checkNoDuplicateOrders(snapshot) {
  const allOrderIds = [
    ...snapshot.pending.map((order) => order.id),
    ...snapshot.processing.map(({ order }) => order.id),
    ...snapshot.complete.map((order) => order.id),
  ];
  assert(new Set(allOrderIds).size === allOrderIds.length, 'duplicate order across states');
}

function checkBotLinks(snapshot) {
  const processingOrderIds = new Set(snapshot.processing.map(({ order }) => order.id));
  for (const bot of snapshot.bots) {
    if (bot.status === 'PROCESSING') {
      assert(bot.currentOrderId !== null, `processing bot ${bot.id} has no current order`);
      assert(
        processingOrderIds.has(bot.currentOrderId),
        `bot ${bot.id} points at missing order ${bot.currentOrderId}`,
      );
    } else {
      assert(bot.currentOrderId === null, `idle bot ${bot.id} still points at an order`);
    }
  }
}

async function highThroughputDrain() {
  const clock = new FakeClock();
  const ctrl = new OrderController(clock, clock);
  const total = 5_000;
  const bots = 250;

  for (let i = 0; i < total; i += 1) ctrl.addOrder(i % 7 === 0 ? 'VIP' : 'NORMAL');
  for (let i = 0; i < bots; i += 1) ctrl.addBot();

  let snapshot = ctrl.snapshot();
  assert(snapshot.processing.length === bots, `expected ${bots} processing orders`);
  checkNoDuplicateOrders(snapshot);
  checkBotLinks(snapshot);

  for (let tick = 0; tick < Math.ceil(total / bots); tick += 1) {
    clock.advance(DEFAULT_COOK_MS);
    snapshot = ctrl.snapshot();
    checkNoDuplicateOrders(snapshot);
    checkBotLinks(snapshot);
  }

  snapshot = ctrl.snapshot();
  assert(snapshot.pending.length === 0, `pending left: ${snapshot.pending.length}`);
  assert(snapshot.processing.length === 0, `processing left: ${snapshot.processing.length}`);
  assert(snapshot.complete.length === total, `completed ${snapshot.complete.length}/${total}`);
  assert(snapshot.bots.every((bot) => bot.status === 'IDLE'), 'not all bots returned to IDLE');
  console.log('PASS highThroughputDrain', { total, bots, complete: snapshot.complete.length });
}

async function requeueUnderLoad() {
  const clock = new FakeClock();
  const ctrl = new OrderController(clock, clock);

  for (let i = 0; i < 20; i += 1) ctrl.addOrder('NORMAL');
  for (let i = 0; i < 5; i += 1) ctrl.addBot();

  const before = ctrl.snapshot();
  const newestBotId = Math.max(...before.bots.map((bot) => bot.id));
  const requeuedOrderId = before.bots.find((bot) => bot.id === newestBotId).currentOrderId;

  ctrl.removeBot();
  const afterRemove = ctrl.snapshot();
  assert(
    afterRemove.pending[0].id === requeuedOrderId,
    `requeued order ${requeuedOrderId} was not restored ahead of later normal orders`,
  );

  ctrl.addBot();
  const afterAdd = ctrl.snapshot();
  assert(
    afterAdd.processing.some(({ order }) => order.id === requeuedOrderId),
    'fresh bot did not resume the requeued order first',
  );

  for (let tick = 0; tick < 5; tick += 1) clock.advance(DEFAULT_COOK_MS);
  const finalSnapshot = ctrl.snapshot();
  assert(finalSnapshot.complete.length === 20, `completed ${finalSnapshot.complete.length}/20`);
  console.log('PASS requeueUnderLoad', { requeuedOrderId, activeBots: finalSnapshot.bots.length });
}

async function concurrentMicrotasks() {
  const clock = new FakeClock();
  const ctrl = new OrderController(clock, clock);

  await Promise.all([
    ...Array.from({ length: 1_000 }, (_, index) =>
      Promise.resolve().then(() => ctrl.addOrder(index % 3 === 0 ? 'VIP' : 'NORMAL')),
    ),
    ...Array.from({ length: 50 }, () => Promise.resolve().then(() => ctrl.addBot())),
  ]);

  let snapshot = ctrl.snapshot();
  assert(
    snapshot.pending.length + snapshot.processing.length + snapshot.complete.length === 1_000,
    'lost order after concurrent microtask scheduling',
  );
  assert(snapshot.processing.length <= 50, 'more processing orders than bots');
  checkNoDuplicateOrders(snapshot);
  checkBotLinks(snapshot);

  for (let tick = 0; tick < 25; tick += 1) clock.advance(DEFAULT_COOK_MS);
  snapshot = ctrl.snapshot();
  assert(snapshot.complete.length === 1_000, `completed ${snapshot.complete.length}/1000`);
  console.log('PASS concurrentMicrotasks', { complete: snapshot.complete.length, bots: snapshot.bots.length });
}

async function apiConcurrentSmoke() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(0, '127.0.0.1');

  const server = app.getHttpServer();
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api`;

  try {
    const orderResponses = await Promise.all(
      Array.from({ length: 120 }, (_, index) =>
        fetch(`${baseUrl}/orders`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ type: index % 4 === 0 ? 'vip' : 'normal' }),
        }),
      ),
    );
    assert(orderResponses.every((response) => response.status === 201), 'not all order creates returned 201');
    const orders = await Promise.all(orderResponses.map((response) => response.json()));
    assert(new Set(orders.map((order) => order.id)).size === 120, 'duplicate order ids through API');

    const botResponses = await Promise.all(
      Array.from({ length: 12 }, () => fetch(`${baseUrl}/bots`, { method: 'POST' })),
    );
    assert(botResponses.every((response) => response.status === 201), 'not all bot creates returned 201');

    const firstStatus = await (await fetch(`${baseUrl}/status`)).json();
    assert(firstStatus.processing.length === 12, `expected 12 processing, got ${firstStatus.processing.length}`);
    assert(firstStatus.pending.length === 108, `expected 108 pending, got ${firstStatus.pending.length}`);
    assert(
      firstStatus.processing.every(({ order }) => order.type === 'VIP'),
      'first processing batch should be VIP under priority',
    );

    await new Promise((resolve) => setTimeout(resolve, 10_700));
    const secondStatus = await (await fetch(`${baseUrl}/status`)).json();
    assert(secondStatus.complete.length === 12, `expected 12 complete, got ${secondStatus.complete.length}`);
    assert(secondStatus.processing.length === 12, `expected 12 next processing, got ${secondStatus.processing.length}`);

    for (let i = 0; i < 12; i += 1) {
      const response = await fetch(`${baseUrl}/bots`, { method: 'DELETE' });
      assert(response.status === 200, `delete bot ${i} returned ${response.status}`);
    }

    const finalStatus = await (await fetch(`${baseUrl}/status`)).json();
    assert(finalStatus.bots.length === 0, `expected 0 bots, got ${finalStatus.bots.length}`);
    assert(finalStatus.pending.length + finalStatus.complete.length === 120, 'lost orders after cleanup');
    console.log('PASS apiConcurrentSmoke', {
      orders: orders.length,
      completeAfterFirstWindow: secondStatus.complete.length,
      pendingAfterCleanup: finalStatus.pending.length,
    });
  } finally {
    await app.close();
  }
}

async function main() {
  await highThroughputDrain();
  await requeueUnderLoad();
  await concurrentMicrotasks();
  await apiConcurrentSmoke();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
