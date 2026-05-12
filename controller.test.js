const { strict: assert } = require("assert");
const { describe, it, afterEach } = require("node:test");
const { OrderController } = require("./controller");

const FAST = 50;

function createController() {
  return new OrderController(FAST, null);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("Order Creation", () => {
  it("creates a normal order in PENDING", () => {
    const ctrl = createController();
    const order = ctrl.newNormalOrder();
    assert.equal(order.id, 1);
    assert.equal(order.type, "Normal");
    assert.equal(order.status, "PENDING");
    assert.equal(ctrl.pendingOrders.length, 1);
  });

  it("creates VIP order before normal orders", () => {
    const ctrl = createController();
    ctrl.newNormalOrder();
    ctrl.newNormalOrder();
    ctrl.newVIPOrder();
    assert.equal(ctrl.pendingOrders[0].type, "VIP");
    assert.equal(ctrl.pendingOrders[0].id, 3);
    assert.equal(ctrl.pendingOrders[1].id, 1);
    assert.equal(ctrl.pendingOrders[2].id, 2);
  });

  it("places VIP orders behind existing VIP orders", () => {
    const ctrl = createController();
    ctrl.newNormalOrder();
    ctrl.newVIPOrder();
    ctrl.newNormalOrder();
    ctrl.newVIPOrder();
    assert.equal(ctrl.pendingOrders[0].id, 2);
    assert.equal(ctrl.pendingOrders[0].type, "VIP");
    assert.equal(ctrl.pendingOrders[1].id, 4);
    assert.equal(ctrl.pendingOrders[1].type, "VIP");
    assert.equal(ctrl.pendingOrders[2].id, 1);
    assert.equal(ctrl.pendingOrders[3].id, 3);
  });

  it("assigns unique incrementing IDs", () => {
    const ctrl = createController();
    const o1 = ctrl.newNormalOrder();
    const o2 = ctrl.newVIPOrder();
    const o3 = ctrl.newNormalOrder();
    assert.equal(o1.id, 1);
    assert.equal(o2.id, 2);
    assert.equal(o3.id, 3);
  });
});

describe("Bot Management", () => {
  it("creates a bot that picks up pending order", () => {
    const ctrl = createController();
    ctrl.newNormalOrder();
    const bot = ctrl.addBot();
    assert.equal(bot.currentOrder.id, 1);
    assert.equal(bot.currentOrder.status, "PROCESSING");
    assert.equal(ctrl.pendingOrders.length, 0);
  });

  it("creates a bot that stays idle with no orders", () => {
    const ctrl = createController();
    const bot = ctrl.addBot();
    assert.equal(bot.currentOrder, null);
  });

  it("bot picks up VIP order first", () => {
    const ctrl = createController();
    ctrl.newNormalOrder();
    ctrl.newVIPOrder();
    const bot = ctrl.addBot();
    assert.equal(bot.currentOrder.id, 2);
    assert.equal(bot.currentOrder.type, "VIP");
  });

  it("removes the newest bot", () => {
    const ctrl = createController();
    ctrl.addBot();
    ctrl.addBot();
    assert.equal(ctrl.bots.length, 2);
    ctrl.removeBot();
    assert.equal(ctrl.bots.length, 1);
    assert.equal(ctrl.bots[0].id, 1);
  });

  it("does nothing when removing bot with no bots", () => {
    const ctrl = createController();
    ctrl.removeBot();
    assert.equal(ctrl.bots.length, 0);
  });
});

describe("Bot Processing", () => {
  it("completes order after processing time", async () => {
    const ctrl = createController();
    ctrl.newNormalOrder();
    ctrl.addBot();
    await sleep(FAST + 30);
    assert.equal(ctrl.completeOrders.length, 1);
    assert.equal(ctrl.completeOrders[0].status, "COMPLETE");
    assert.equal(ctrl.pendingOrders.length, 0);
  });

  it("picks up next order after completion", async () => {
    const ctrl = createController();
    ctrl.newNormalOrder();
    ctrl.newNormalOrder();
    ctrl.addBot();
    await sleep(FAST + 30);
    assert.equal(ctrl.completeOrders.length, 1);
    assert.equal(ctrl.bots[0].currentOrder.id, 2);
    await sleep(FAST + 30);
    assert.equal(ctrl.completeOrders.length, 2);
  });

  it("goes idle when no pending orders remain", async () => {
    const ctrl = createController();
    ctrl.newNormalOrder();
    ctrl.addBot();
    await sleep(FAST + 30);
    assert.equal(ctrl.bots[0].currentOrder, null);
    assert.equal(ctrl.completeOrders.length, 1);
  });

  it("idle bot picks up new order", async () => {
    const ctrl = createController();
    ctrl.addBot();
    assert.equal(ctrl.bots[0].currentOrder, null);
    ctrl.newNormalOrder();
    assert.equal(ctrl.bots[0].currentOrder.id, 1);
    assert.equal(ctrl.bots[0].currentOrder.status, "PROCESSING");
  });
});

describe("Remove Bot While Processing", () => {
  it("returns order to pending when bot removed", () => {
    const ctrl = createController();
    ctrl.newNormalOrder();
    ctrl.addBot();
    assert.equal(ctrl.bots[0].currentOrder.id, 1);
    ctrl.removeBot();
    assert.equal(ctrl.bots.length, 0);
    assert.equal(ctrl.pendingOrders.length, 1);
    assert.equal(ctrl.pendingOrders[0].id, 1);
    assert.equal(ctrl.pendingOrders[0].status, "PENDING");
  });

  it("returns VIP order before normal orders", () => {
    const ctrl = createController();
    ctrl.newNormalOrder();
    ctrl.newNormalOrder();
    ctrl.newVIPOrder();
    ctrl.addBot();
    ctrl.addBot();
    assert.equal(ctrl.bots[1].currentOrder.id, 1);
    ctrl.removeBot();
    assert.equal(ctrl.pendingOrders[0].id, 1);
    assert.equal(ctrl.pendingOrders[1].id, 2);
  });

  it("returns VIP order to front of queue", () => {
    const ctrl = createController();
    ctrl.newNormalOrder();
    ctrl.newVIPOrder();
    ctrl.newVIPOrder();
    ctrl.addBot();
    ctrl.addBot();
    assert.equal(ctrl.bots[0].currentOrder.id, 2);
    assert.equal(ctrl.bots[1].currentOrder.id, 3);
    ctrl.removeBot();
    assert.equal(ctrl.pendingOrders[0].id, 3);
    assert.equal(ctrl.pendingOrders[0].type, "VIP");
    assert.equal(ctrl.pendingOrders[1].id, 1);
  });
});

describe("Status", () => {
  it("reports correct status", async () => {
    const ctrl = createController();
    ctrl.newNormalOrder();
    ctrl.newVIPOrder();
    ctrl.addBot();
    await sleep(FAST * 2 + 50);
    const status = ctrl.getStatus();
    assert.equal(status.totalCompleted, 2);
    assert.equal(status.vipCompleted, 1);
    assert.equal(status.normalCompleted, 1);
    assert.equal(status.activeBots, 1);
    assert.equal(status.pendingOrders, 0);
  });
});
