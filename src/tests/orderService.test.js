const botService = require("../services/botService.js");
const { orderService } = require("../services/orderService.js");
const setupTestEnv = require("./testUtils.js");

describe("OrderService", () => {
  setupTestEnv();

  test("should create a normal order", () => {
    const order = orderService.createOrder("Normal");
    expect(order.id).toBe(1);
    expect(order.type).toBe("Normal");
    expect(order.status).toBe("PENDING");
    expect(orderService.pending).toContain(order);
  });

  test("should create a VIP order in front of normal orders", () => {
    const normalOrder = orderService.createOrder("Normal");
    const vipOrder = orderService.createOrder("VIP");

    expect(orderService.pending[0]).toBe(vipOrder);
    expect(orderService.pending[1]).toBe(normalOrder);
  });

  test("order should be not be in pending if under processing", () => {
    const order = orderService.createOrder("Normal");
    botService.addBot();

    expect(orderService.pending).not.toContain(order);
    expect(botService.processing.values()).toContain(order);
  });

  test("should complete order correctly", () => {
    const order = orderService.createOrder("Normal");
    const bot = botService.addBot();

    orderService.completeOrder(order, bot.id, 10);

    expect(order.status).toBe("COMPLETE");
    expect(orderService.complete).toContain(order);
    expect(orderService.pending).not.toContain(order);
  });
});
