import { OrderController } from "../orderController/OrderController";
import { OrderType, OrderStatus } from "../orderController/Order";
import { BotStatus } from "../orderController/Bot";

// Mock resultWriter so tests don't touch the filesystem
jest.mock("../orderController/resultWriter", () => ({
  write: jest.fn(),
  clearResult: jest.fn(),
}));

// Use fake timers so 10s timeouts fire instantly
jest.useFakeTimers();

describe("OrderController", () => {
  let controller: OrderController;

  beforeEach(() => {
    controller = new OrderController();
  });

  test("normal order is added to normal queue", () => {
    controller.newOrder(OrderType.NORMAL);
    expect(controller.getNormalQueue()).toHaveLength(1);
    expect(controller.getVipQueue()).toHaveLength(0);
  });

  test("VIP order is added to vip queue", () => {
    controller.newOrder(OrderType.VIP);
    expect(controller.getVipQueue()).toHaveLength(1);
    expect(controller.getNormalQueue()).toHaveLength(0);
  });

  test("order counter increments for each order", () => {
    const o1 = controller.newOrder(OrderType.NORMAL);
    const o2 = controller.newOrder(OrderType.VIP);
    expect(o2.id).toBe(o1.id + 1);
  });

  test("VIP order is dispatched before normal order", () => {
    controller.newOrder(OrderType.NORMAL); // id 1 — stays queued
    controller.newOrder(OrderType.VIP);    // id 2 — jumps to front of VIP queue
    const bot = controller.addBot();
    // Bot should have picked up the VIP order
    expect(bot.currentOrder?.type).toBe(OrderType.VIP);
  });

  test("adding a bot immediately picks up a pending order", () => {
    controller.newOrder(OrderType.NORMAL);
    const bot = controller.addBot();
    expect(bot.status).toBe(BotStatus.PROCESSING);
    expect(bot.currentOrder).not.toBeNull();
  });

  test("bot becomes IDLE when no orders pending", () => {
    const bot = controller.addBot();
    expect(bot.status).toBe(BotStatus.IDLE);
  });

  test("removing a bot returns its in-progress order to front of queue", () => {
    controller.newOrder(OrderType.NORMAL); // id 1
    controller.addBot();                   // Bot #1 picks up order #1
    controller.removeBot();                // Bot #1 removed, order #1 returned
    expect(controller.getNormalQueue()).toHaveLength(1);
    expect(controller.getNormalQueue()[0].status).toBe(OrderStatus.PENDING);
  });

  test("bot picks up next order after completing one", () => {
    controller.newOrder(OrderType.NORMAL); // id 1
    controller.newOrder(OrderType.NORMAL); // id 2
    const bot = controller.addBot();       // picks up id 1
    expect(bot.currentOrder?.id).toBe(1);

    // Fast-forward exactly 10s — order #1 completes, bot picks up #2
    jest.advanceTimersByTime(10_000);
    expect(bot.currentOrder?.id).toBe(2);
  });
});
