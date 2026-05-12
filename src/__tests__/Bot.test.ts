import { Bot, BotStatus } from "../orderController/Bot";
import { Order, OrderType, OrderStatus } from "../orderController/Order";

jest.mock("../orderController/resultWriter", () => ({
  write: jest.fn(),
  clearResult: jest.fn(),
}));

jest.useFakeTimers();

function makeOrder(id = 1, type = OrderType.NORMAL): Order {
  return { id, type, status: OrderStatus.PENDING };
}

describe("Bot", () => {
  test("starts with IDLE status and no current order", () => {
    const bot = new Bot(1);
    expect(bot.status).toBe(BotStatus.IDLE);
    expect(bot.currentOrder).toBeNull();
  });

  test("pickupOrder sets status to PROCESSING", () => {
    const bot = new Bot(1);
    bot.pickupOrder(makeOrder(), jest.fn());
    expect(bot.status).toBe(BotStatus.PROCESSING);
    expect(bot.currentOrder).not.toBeNull();
  });

  test("onComplete is called after 10 seconds", () => {
    const bot = new Bot(1);
    const onComplete = jest.fn();
    bot.pickupOrder(makeOrder(), onComplete);
    expect(onComplete).not.toHaveBeenCalled();
    jest.advanceTimersByTime(10_000);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  test("order status is COMPLETE after processing", () => {
    const bot = new Bot(1);
    const order = makeOrder();
    bot.pickupOrder(order, jest.fn());
    jest.advanceTimersByTime(10_000);
    expect(order.status).toBe(OrderStatus.COMPLETE);
  });

  test("bot returns to IDLE after completing an order", () => {
    const bot = new Bot(1);
    bot.pickupOrder(makeOrder(), jest.fn());
    jest.advanceTimersByTime(10_000);
    expect(bot.status).toBe(BotStatus.IDLE);
    expect(bot.currentOrder).toBeNull();
  });

  test("stop() cancels processing and returns the order", () => {
    const bot = new Bot(1);
    const order = makeOrder();
    bot.pickupOrder(order, jest.fn());
    const returned = bot.stop();
    expect(returned).toBe(order);
    expect(returned?.status).toBe(OrderStatus.PENDING);
    expect(bot.status).toBe(BotStatus.IDLE);
    expect(bot.currentOrder).toBeNull();
  });

  test("stop() on IDLE bot returns null", () => {
    const bot = new Bot(1);
    const returned = bot.stop();
    expect(returned).toBeNull();
  });
});
