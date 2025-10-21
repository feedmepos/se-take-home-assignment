const botService = require("../services/botService.js");
const { orderService } = require("../services/orderService.js");
const setupTestEnv = require("./testUtils.js");

describe("OrderBotIntegration", () => {
  setupTestEnv();

  test("removing bot while order is processing should place it back in pending", () => {
    const order = orderService.createOrder("Normal");
    const bot = botService.addBot();
    expect(botService.processing.size).toBe(1);

    botService.removeBot();
    expect(orderService.pending).toHaveLength(1);
    expect(orderService.complete).toHaveLength(0);
    expect(botService.processing.size).toBe(0);
  });

  test("removing one bot when 2 orders are processing should unprocess the second order", () => {
    const order1 = orderService.createOrder("Normal");
    const order2 = orderService.createOrder("Normal");
    const bot1 = botService.addBot();
    const bot2 = botService.addBot();
    expect(botService.processing.get(bot1.id)).toBe(order1);
    expect(botService.processing.get(bot2.id)).toBe(order2);

    botService.removeBot();
    expect(botService.processing.size).toBe(1);
    expect(botService.processing.get(bot1.id)).toBe(order1);
    expect(orderService.pending).toContain(order2);
  });

  test("adding a bot when there is one normal and one VIP order should process VIP first", () => {
    const order1 = orderService.createOrder("Normal");
    const order2 = orderService.createOrder("VIP");
    const bot = botService.addBot();
    expect(botService.processing.get(bot.id)).toBe(order2);
    expect(orderService.pending).toContain(order1);
  });

  test("adding a bot when there is one normal and two VIP orders should process the first VIP order", () => {
    const orderNormal = orderService.createOrder("Normal");
    const orderVip1 = orderService.createOrder("VIP");
    const orderVip2 = orderService.createOrder("VIP");
    const bot = botService.addBot();
    expect(botService.processing.get(bot.id)).toBe(orderVip1);
    expect(orderService.pending).toContain(orderNormal);
    expect(orderService.pending).toContain(orderVip2);
  });

  test("bot should process orders one at a time", () => {
    jest.useFakeTimers();

    const order1 = orderService.createOrder("Normal");
    const order2 = orderService.createOrder("Normal");
    const bot = botService.addBot();
    expect(botService.processing.get(bot.id)).toBe(order1);
    expect(orderService.pending).toContain(order2);

    // Fast-forward 10s
    jest.advanceTimersByTime(10000);
    expect(orderService.complete).toContain(order1);
    expect(botService.processing.get(bot.id)).toBe(order2);
  });

  test("destroying bot and creating a new one should place unprocessed order back in processing", () => {
    const order1 = orderService.createOrder("Normal");
    const order2 = orderService.createOrder("Normal");
    const bot1 = botService.addBot();
    expect(botService.processing.get(bot1.id)).toBe(order1);

    botService.removeBot();
    expect(orderService.pending).toHaveLength(2);
    expect(botService.processing.size).toBe(0);

    const bot2 = botService.addBot();
    expect(botService.processing.size).toBe(1);
    expect(botService.processing.get(bot2.id)).toBe(order1);
    expect(orderService.pending).toContain(order2);
  });
});
