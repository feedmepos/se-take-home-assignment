const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createQueue } = require("../src/queue");
const { createController } = require("../src/controller");

const FAST = 20;

function setup(processingTime = FAST) {
  const queue = createQueue();
  const logs = [];
  const controller = createController({
    queue,
    onLog: (msg) => logs.push(msg),
    processingTime,
  });
  return { queue, logs, controller };
}

test("addOrder places NORMAL in queue", () => {
  const { queue, controller } = setup();
  controller.addOrder("NORMAL");
  assert.equal(queue.size, 1);
  assert.equal(queue.list()[0].type, "NORMAL");
});

test("addOrder VIP slots before NORMAL", () => {
  const { queue, controller } = setup();
  controller.addOrder("NORMAL");
  controller.addOrder("VIP");
  assert.equal(queue.list()[0].type, "VIP");
});

test("order IDs are unique and incrementing", () => {
  const { controller } = setup();
  const a = controller.addOrder("NORMAL");
  const b = controller.addOrder("VIP");
  assert.equal(b.id, a.id + 1);
});

test("addBot picks up pending order immediately", () => {
  const { queue, controller } = setup();
  controller.addOrder("NORMAL");
  controller.addBot();
  assert.equal(queue.size, 0);
});

test("bot completes order after processingTime", (t, done) => {
  const { controller } = setup(FAST);
  controller.addOrder("NORMAL");
  controller.addBot();
  setTimeout(() => {
    const { completed } = controller.getStatus();
    assert.equal(completed.length, 1);
    done();
  }, FAST * 3);
});

test("bot goes idle when queue is empty", (t, done) => {
  const { controller } = setup(FAST);
  controller.addOrder("NORMAL");
  controller.addBot();
  setTimeout(() => {
    const { bots } = controller.getStatus();
    assert.equal(bots[0].currentOrder, null);
    done();
  }, FAST * 3);
});

test("idle bot picks up new order when added", () => {
  const { queue, controller } = setup();
  controller.addBot();
  controller.addOrder("NORMAL");
  assert.equal(queue.size, 0);
});

test("removeBot returns processing order to queue", () => {
  const { queue, controller } = setup(60000);
  controller.addOrder("NORMAL");
  controller.addBot();
  assert.equal(queue.size, 0);
  controller.removeBot();
  assert.equal(queue.size, 1);
});

test("removeBot removes newest bot", () => {
  const { controller } = setup(60000);
  const b1 = controller.addBot();
  controller.addBot();
  controller.removeBot();
  const { bots } = controller.getStatus();
  assert.equal(bots.length, 1);
  assert.equal(bots[0].id, b1.id);
});

test("removeBot on empty does nothing", () => {
  const { controller } = setup();
  assert.doesNotThrow(() => controller.removeBot());
});

test("removeBot assigns returned order to idle bot", (t, done) => {
  const PROC = 100;
  const { queue, controller } = setup(PROC);

  controller.addBot(); // bot1
  controller.addOrder("NORMAL"); // bot1 picks up order1 at t=0
  controller.addBot(); // bot2 idle (queue empty)

  // at t=50ms bot1 is still processing; bot2 picks up order2
  setTimeout(() => {
    controller.addOrder("NORMAL");
  }, 50);

  // at t=PROC+20ms bot1 has finished and is idle; bot2 still processing
  // removeBot removes bot2, returns order2; bot1 (idle) should pick it up
  setTimeout(() => {
    controller.removeBot();
    assert.equal(queue.size, 0); // bot1 dequeued the returned order immediately
    done();
  }, PROC + 20);
});
