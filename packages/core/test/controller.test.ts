import { describe, expect, it } from "vitest";

import {
  ControllerError,
  FakeScheduler,
  createOrderController,
  type DispatchPolicy,
  type OrderQueueComparator,
} from "../src/index.js";

describe("OrderController", () => {
  it("queues VIP orders ahead of normal orders while preserving VIP order", () => {
    const scheduler = new FakeScheduler();
    const controller = createOrderController({}, scheduler);

    controller.createNormalOrder();
    controller.createVipOrder();
    controller.createNormalOrder();
    controller.createVipOrder();

    expect(controller.getSnapshot().pendingOrders.map((order) => [order.id, order.priority])).toEqual([
      [1002, "vip"],
      [1004, "vip"],
      [1001, "normal"],
      [1003, "normal"],
    ]);
  });

  it("creates orders through the generic order API", () => {
    const controller = createOrderController({}, new FakeScheduler());

    controller.createOrder("normal");
    controller.createOrder("vip");

    expect(controller.getSnapshot().pendingOrders.map((order) => [order.id, order.priority])).toEqual([
      [1002, "vip"],
      [1001, "normal"],
    ]);
  });

  it("supports replacing the queue order comparator", () => {
    const normalFirst: OrderQueueComparator = (left, right) => {
      const rank = { normal: 0, vip: 1 };
      return rank[left.priority] - rank[right.priority] || left.id - right.id;
    };
    const controller = createOrderController({ orderQueueComparator: normalFirst }, new FakeScheduler());

    controller.createVipOrder();
    controller.createNormalOrder();
    controller.createVipOrder();

    expect(controller.getSnapshot().pendingOrders.map((order) => [order.id, order.priority])).toEqual([
      [1002, "normal"],
      [1001, "vip"],
      [1003, "vip"],
    ]);
  });

  it("supports replacing the dispatch policy", () => {
    const holdUntilSecondBot: DispatchPolicy = {
      selectAssignments: ({ idleBots, pendingOrders }) => {
        const secondBot = idleBots.find((bot) => bot.id === 2);
        const secondOrder = pendingOrders.find((order) => order.id === 1002);
        return secondBot && secondOrder ? [{ botId: secondBot.id, orderId: secondOrder.id }] : [];
      },
    };
    const controller = createOrderController({ dispatchPolicy: holdUntilSecondBot }, new FakeScheduler());

    controller.createNormalOrder();
    controller.createVipOrder();
    controller.addBot();
    controller.addBot();

    const snapshot = controller.getSnapshot();
    expect(snapshot.processingOrders.map((order) => [order.id, order.assignedBotId])).toEqual([[1002, 2]]);
    expect(snapshot.pendingOrders.map((order) => order.id)).toEqual([1001]);
    expect(snapshot.bots.find((bot) => bot.id === 1)?.status).toBe("idle");
  });

  it("dispatches orders immediately and completes them after fake time advances", () => {
    const scheduler = new FakeScheduler();
    const controller = createOrderController({}, scheduler);

    controller.createVipOrder();
    controller.addBot();

    expect(controller.getSnapshot().processingOrders.map((order) => order.id)).toEqual([1001]);

    scheduler.advanceBy(10_000);

    const snapshot = controller.getSnapshot();
    expect(snapshot.completedOrders.map((order) => order.id)).toEqual([1001]);
    expect(snapshot.metrics.averageProcessingTimeSeconds).toBe(10);
    expect(snapshot.metrics.completedCount).toBe(1);
    expect(snapshot.metrics.idleBotCount).toBe(1);
  });

  it("allows processing duration to depend on the order and bot", () => {
    const scheduler = new FakeScheduler();
    const controller = createOrderController(
      {
        processingDurationResolver: (order) => (order.priority === "vip" ? 5_000 : 15_000),
      },
      scheduler,
    );

    controller.createVipOrder();
    controller.createNormalOrder();
    controller.addBot();
    controller.addBot();

    scheduler.advanceBy(5_000);
    expect(controller.getSnapshot().completedOrders.map((order) => order.id)).toEqual([1001]);

    scheduler.advanceBy(10_000);
    expect(controller.getSnapshot().metrics.averageProcessingTimeSeconds).toBe(10);
  });

  it("returns the in-flight order to pending when the latest bot is removed", () => {
    const scheduler = new FakeScheduler();
    const controller = createOrderController({}, scheduler);

    controller.createNormalOrder();
    controller.createVipOrder();
    controller.addBot();
    controller.addBot();

    const removedBot = controller.removeLatestBot();

    const snapshot = controller.getSnapshot();
    expect(removedBot.id).toBe(2);
    expect(snapshot.processingOrders.map((order) => order.id)).toEqual([1002]);
    expect(snapshot.pendingOrders.map((order) => order.id)).toEqual([1001]);
    expect(snapshot.pendingOrders[0]?.priority).toBe("normal");
  });

  it("removes a specific bot by id", () => {
    const scheduler = new FakeScheduler();
    const controller = createOrderController({}, scheduler);

    controller.createNormalOrder();
    controller.createVipOrder();
    controller.addBot();
    controller.addBot();

    const removedBot = controller.removeBot(1);

    const snapshot = controller.getSnapshot();
    expect(removedBot.id).toBe(1);
    expect(snapshot.bots.map((bot) => bot.id)).toEqual([2]);
    expect(snapshot.processingOrders.map((order) => [order.id, order.assignedBotId])).toEqual([[1001, 2]]);
    expect(snapshot.pendingOrders.map((order) => order.id)).toEqual([1002]);
  });

  it("throws a helpful error when no bot can be removed", () => {
    const controller = createOrderController({}, new FakeScheduler());
    expect(() => controller.removeLatestBot()).toThrowError(ControllerError);
    expect(() => controller.removeLatestBot()).toThrowError("No bots available to remove.");
  });

  it("throws a helpful error when a specific bot does not exist", () => {
    const controller = createOrderController({}, new FakeScheduler());
    expect(() => controller.removeBot(42)).toThrowError("Bot #42 does not exist.");
  });

  it("computes utilization and completion rate metrics", () => {
    const scheduler = new FakeScheduler();
    const controller = createOrderController({}, scheduler);

    controller.createNormalOrder();
    controller.createNormalOrder();
    controller.addBot();
    controller.addBot();

    let snapshot = controller.getSnapshot();
    expect(snapshot.metrics.botUtilizationRate).toBe(1);
    expect(snapshot.metrics.processingCount).toBe(2);

    scheduler.advanceBy(10_000);
    snapshot = controller.getSnapshot();
    expect(snapshot.metrics.completedCount).toBe(2);
    expect(snapshot.metrics.ordersCompletedPerMinute).toBeGreaterThan(0);
  });

  it("bounds stored event history and includes structured event payloads", () => {
    const controller = createOrderController({ maxEventHistory: 2 }, new FakeScheduler());

    controller.createNormalOrder();
    controller.createVipOrder();
    controller.createNormalOrder();

    const events = controller.getEvents();
    expect(events).toHaveLength(2);
    expect(events.map((event) => event.payload?.orderId)).toEqual([1002, 1003]);
  });
});
