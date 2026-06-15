"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  ORDER_KINDS,
  OrderController,
  formatTime,
  parseTime,
  runDemoScenario,
} = require("../src/order-controller");
const { runCommands } = require("../src/cli");

test("VIP orders are queued before Normal orders and after existing VIP orders", () => {
  const controller = new OrderController();

  controller.createOrder(ORDER_KINDS.NORMAL);
  controller.createOrder(ORDER_KINDS.VIP);
  controller.createOrder(ORDER_KINDS.NORMAL);
  controller.createOrder(ORDER_KINDS.VIP);

  assert.deepEqual(
    controller.snapshot().pending.map((order) => order.id),
    [2, 4, 1, 3],
  );
});

test("orders receive unique increasing ids", () => {
  const controller = new OrderController();

  const orders = [
    controller.createOrder(ORDER_KINDS.NORMAL),
    controller.createOrder(ORDER_KINDS.VIP),
    controller.createOrder(ORDER_KINDS.NORMAL),
  ];

  assert.deepEqual(
    orders.map((order) => order.id),
    [1, 2, 3],
  );
});

test("a bot completes one order after 10 seconds and immediately starts the next", () => {
  const controller = new OrderController({ startTime: "09:30:00" });

  controller.addBot();
  controller.createOrder(ORDER_KINDS.NORMAL);
  controller.createOrder(ORDER_KINDS.NORMAL);

  assert.equal(controller.snapshot().bots[0].job.order.id, 1);

  controller.tick(9);
  assert.equal(controller.snapshot().completed.length, 0);

  controller.tick(1);
  const snapshot = controller.snapshot();

  assert.equal(snapshot.completed.length, 1);
  assert.equal(snapshot.completed[0].order.id, 1);
  assert.equal(snapshot.completed[0].completedAt, "09:30:10");
  assert.equal(snapshot.bots[0].job.order.id, 2);
});

test("removing the latest busy bot returns its order to the priority queue", () => {
  const controller = new OrderController();

  controller.addBot();
  controller.addBot();
  controller.createOrder(ORDER_KINDS.NORMAL);
  controller.createOrder(ORDER_KINDS.VIP);
  controller.createOrder(ORDER_KINDS.NORMAL);

  controller.removeLatestBot();

  const snapshot = controller.snapshot();

  assert.equal(snapshot.bots.length, 1);
  assert.deepEqual(
    snapshot.pending.map((order) => order.id),
    [2, 3],
  );
  assert.equal(snapshot.bots[0].job.order.id, 1);
});

test("time helpers enforce and emit HH:MM:SS format", () => {
  assert.equal(parseTime("23:59:58"), 86398);
  assert.equal(formatTime(86401), "00:00:01");
  assert.throws(() => parseTime("9:00"), /Invalid time/);
});

test("demo and scripted CLI output include completion timestamps", () => {
  const demoOutput = runDemoScenario();
  const scriptedOutput = runCommands([
    "add-bot",
    "normal",
    "tick 10",
    "status",
  ]);

  assert.match(demoOutput, /\[08:00:10\] Completed order #1 by bot #1/);
  assert.match(scriptedOutput, /\[08:00:10\] Completed order #1 by bot #1/);
  assert.match(scriptedOutput, /\[08:00:10\] time=08:00:10/);
});
