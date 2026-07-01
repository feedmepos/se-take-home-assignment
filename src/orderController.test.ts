import { describe, expect, it } from "vitest";
import { OrderController } from "./orderController";

const start = new Date("2026-07-01T12:00:00Z").getTime();

describe("OrderController", () => {
  it("queues VIP orders before normal orders while preserving FIFO inside each priority", () => {
    const controller = new OrderController();

    controller.createOrder("NORMAL", start);
    controller.createOrder("VIP", start + 1);
    controller.createOrder("NORMAL", start + 2);
    const state = controller.createOrder("VIP", start + 3);

    expect(state.pendingOrderIds).toEqual([1002, 1004, 1001, 1003]);
  });

  it("assigns pending work to new bots and completes each order after ten seconds", () => {
    const controller = new OrderController();

    controller.createOrder("NORMAL", start);
    let state = controller.addBot(start + 1_000);

    expect(state.bots[0]).toMatchObject({ id: 1, status: "PROCESSING", currentOrderId: 1001 });
    expect(state.orders.find((order) => order.id === 1001)).toMatchObject({
      status: "PROCESSING",
      assignedBotId: 1,
    });

    state = controller.tick(start + 10_999);
    expect(state.orders.find((order) => order.id === 1001)?.status).toBe("PROCESSING");

    state = controller.tick(start + 11_000);
    expect(state.orders.find((order) => order.id === 1001)?.status).toBe("COMPLETE");
    expect(state.bots[0]).toMatchObject({ id: 1, status: "IDLE" });
  });

  it("requeues a processing order when the newest bot is destroyed", () => {
    const controller = new OrderController();

    controller.createOrder("NORMAL", start);
    controller.createOrder("NORMAL", start + 1);
    controller.addBot(start + 2);
    controller.addBot(start + 3);
    const state = controller.removeNewestBot(start + 4);

    expect(state.bots).toHaveLength(1);
    expect(state.bots[0]).toMatchObject({ id: 1, currentOrderId: 1001 });
    expect(state.pendingOrderIds).toEqual([1002]);
    expect(state.orders.find((order) => order.id === 1002)).toMatchObject({
      status: "PENDING",
      assignedBotId: undefined,
    });
  });

  it("lets idle bots immediately pick up newly submitted orders", () => {
    const controller = new OrderController();

    controller.addBot(start);
    const state = controller.createOrder("VIP", start + 1);

    expect(state.pendingOrderIds).toEqual([]);
    expect(state.bots[0]).toMatchObject({ status: "PROCESSING", currentOrderId: 1001 });
  });
});
