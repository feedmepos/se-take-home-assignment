import test from "node:test";
import assert from "assert";
import { Kitchen } from "../src/kitchen.js";
import { OrderType } from "../src/enum/type.js";
import { setTimeout as delay } from "timers/promises";

test("test function createOrder - created orders should match what is expected", () => {
  let kitchen = new Kitchen();
  const orderVIP = kitchen.createOrder(OrderType.VIP);
  const orderNormal = kitchen.createOrder(OrderType.NORMAL);

  assert.deepStrictEqual(orderVIP.orderType, OrderType.VIP);
  assert.deepStrictEqual(orderNormal.orderType, OrderType.NORMAL);
  kitchen = null;
});

test("test function listPendingOrders - order should come back VIP folllowed by normal", () => {
  let kitchen = new Kitchen();
  const order1 = kitchen.createOrder(OrderType.NORMAL);
  const order2 = kitchen.createOrder(OrderType.VIP);
  const order3 = kitchen.createOrder(OrderType.NORMAL);
  const order4 = kitchen.createOrder(OrderType.VIP);

  assert.strictEqual(
    kitchen.listPendingOrders().length,
    4,
    `number of orders created should be the same`
  );
  assert.deepStrictEqual(kitchen.listPendingOrders(), [
    order2,
    order4,
    order1,
    order3,
  ]);
  kitchen = null;
});

test("test buildBots killBot - bots should be killed correctly", async () => {
  let kitchen = new Kitchen();

  await kitchen.buildBots(5);
  assert.strictEqual(
    kitchen.listBots().length,
    5,
    `we generate 5 bots at the start`
  );
  await kitchen.buildBots(2);
  assert.strictEqual(kitchen.listBots().length, 7, `there are 7 bots`);

  let botArr = kitchen.listBots(); //7 items total
  for (let i = botArr.length; i > 0; i--) {
    await kitchen.killBot(botArr[i - 1].id);
    assert.strictEqual(kitchen.listBots().length, i - 1, `bots left`);
  }
  kitchen = null;
});

test("test handling - system should pick up vip order before handling normal order", async () => {
  let kitchen = new Kitchen();
  const order1 = kitchen.createOrder(OrderType.NORMAL, 1);
  const order2 = kitchen.createOrder(OrderType.NORMAL, 1);
  const order3 = kitchen.createOrder(OrderType.NORMAL, 1);
  const order4 = kitchen.createOrder(OrderType.VIP, 1);
  const order5 = kitchen.createOrder(OrderType.NORMAL, 1);
  const order6 = kitchen.createOrder(OrderType.VIP, 1);

  //asset order created are 6
  assert.strictEqual(
    kitchen.listPendingOrders().length,
    6,
    `we created 6 orders to start, 4 normal, 2 vip`
  );

  kitchen.buildBots(2);

  //asset orders left pending are 4
  assert.strictEqual(
    kitchen.listPendingOrders().length,
    4,
    `4 orders left in queue`
  );

  //assert all are Normal orders
  let unique = [
    ...new Set(kitchen.listPendingOrders().map((order) => order.orderType)),
  ];
  assert.deepStrictEqual(
    unique,
    [OrderType.NORMAL],
    `check that pending order is Normal`
  );

  await delay(1100); // Wait for 1100ms, allow first 2 orders to complete

  //orders are assigned, asset orders left 2
  assert.strictEqual(
    kitchen.listPendingOrders().length,
    2,
    `2 more orders have been taken, 2 left`
  );

  kitchen.killBotAll();
  kitchen = null;
});

test("test picks up order and finishes processing after the specified orderProcessTime", async () => {
  let kitchen = new Kitchen();
  kitchen.createOrder(OrderType.NORMAL, 1);
  kitchen.createOrder(OrderType.NORMAL, 1);
  kitchen.createOrder(OrderType.NORMAL, 1);
  kitchen.createOrder(OrderType.VIP, 1);

  //asset orders created are 4
  assert.strictEqual(
    kitchen.listPendingOrders().length,
    4,
    `we created 4 orders to start`
  );

  kitchen.buildBots(2);
  await delay(100); // Wait for 100ms, allow allocator to assign its orders

  //orders are assigned, asset orders left 2
  assert.strictEqual(
    kitchen.listPendingOrders().length,
    2,
    `2 orders have been taken, 2 left`
  );
  await delay(1000); // Wait for 1100ms, allow first 2 orders to complete

  //2 orders done, the remainding 2 were consumed
  assert.strictEqual(
    kitchen.listPendingOrders().length,
    0,
    `2 more orders taken, 0 left`
  );
  assert.strictEqual(
    kitchen.listCompleteOrders().length,
    2,
    `2 more orders complete so far`
  );

  await delay(1000); // Wait for 1100ms, allow first 2 orders to complete

  //2 additional orders done, no more orders
  assert.strictEqual(kitchen.listPendingOrders().length, 0, `0 left`);
  assert.strictEqual(kitchen.listCompleteOrders().length, 4, `all 4 orders completed`);

  await kitchen.killBotAll();
  kitchen = null;
});

test("test handling - ensure that orders being processed by bots are returned to their respective queues", async () => {
  let kitchen = new Kitchen();
  kitchen.createOrder(OrderType.NORMAL, 5);
  kitchen.createOrder(OrderType.VIP, 5);
  kitchen.createOrder(OrderType.NORMAL, 5);
  kitchen.createOrder(OrderType.VIP, 5);

  //asset orders created are 4
  assert.strictEqual(
    kitchen.listPendingOrders().length,
    4,
    `we created 4 orders to start`
  );

  kitchen.buildBots(2);
  //await delay(100); // Wait for 100ms, allow allocator to do its orders

  //orders are assigned, assert orders left 2
  assert.strictEqual(
    kitchen.listPendingOrders().length,
    2,
    `2 orders have been taken, 2 left`
  );

  await kitchen.killBotAll();

  //orders are returned, asset orders left 4
  assert.strictEqual(
    kitchen.listPendingOrders().length,
    4,
    `bots killed and returned orders into pending queue`
  );

  kitchen = null;
});

test("test function processOrder - created orders should match what is expected", () => {
  let kitchen = new Kitchen();
  const orderVIP = kitchen.createOrder(OrderType.VIP);
  const orderNormal = kitchen.createOrder(OrderType.NORMAL);

  assert.deepStrictEqual(orderVIP.orderType, OrderType.VIP);
  assert.deepStrictEqual(orderNormal.orderType, OrderType.NORMAL);
  kitchen = null;
});
