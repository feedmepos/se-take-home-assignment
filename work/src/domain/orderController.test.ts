import { describe, expect, it } from "vitest";
import {
  PROCESSING_TIME_MS,
  ControllerState,
  controllerReducer,
  createInitialState,
} from "./orderController";

const reduce = (
  state: ControllerState,
  action: Parameters<typeof controllerReducer>[1],
) => controllerReducer(state, action);

describe("order controller", () => {
  it("queues VIP orders before normal orders while keeping FIFO within the same type", () => {
    let state = createInitialState();

    state = reduce(state, { type: "add-order", orderType: "normal", now: 0 });
    state = reduce(state, { type: "add-order", orderType: "normal", now: 1 });
    state = reduce(state, { type: "add-order", orderType: "vip", now: 2 });
    state = reduce(state, { type: "add-order", orderType: "vip", now: 3 });

    expect(state.pendingOrders.map((order) => order.id)).toEqual([3, 4, 1, 2]);
  });

  it("creates unique increasing order numbers", () => {
    let state = createInitialState();

    state = reduce(state, { type: "add-order", orderType: "normal", now: 0 });
    state = reduce(state, { type: "add-order", orderType: "vip", now: 0 });
    state = reduce(state, { type: "add-order", orderType: "normal", now: 0 });

    expect(state.pendingOrders.map((order) => order.id).sort()).toEqual([
      1, 2, 3,
    ]);
    expect(state.nextOrderId).toBe(4);
  });

  it("starts work immediately when a bot is added", () => {
    let state = createInitialState();

    state = reduce(state, { type: "add-order", orderType: "normal", now: 0 });
    state = reduce(state, { type: "add-bot", now: 100 });

    expect(state.pendingOrders).toHaveLength(0);
    expect(state.bots[0].status).toBe("processing");
    expect(state.bots[0].currentOrder?.id).toBe(1);
  });

  it("moves an order to complete after 10 seconds and then starts the next order", () => {
    let state = createInitialState();

    state = reduce(state, { type: "add-order", orderType: "normal", now: 0 });
    state = reduce(state, { type: "add-order", orderType: "normal", now: 1 });
    state = reduce(state, { type: "add-bot", now: 100 });
    state = reduce(state, { type: "tick", now: 100 + PROCESSING_TIME_MS });

    expect(state.completedOrders.map((order) => order.id)).toEqual([1]);
    expect(state.bots[0].status).toBe("processing");
    expect(state.bots[0].currentOrder?.id).toBe(2);
  });

  it("idle bots pick up new orders as soon as they arrive", () => {
    let state = createInitialState();

    state = reduce(state, { type: "add-bot", now: 0 });
    state = reduce(state, { type: "add-order", orderType: "vip", now: 50 });

    expect(state.pendingOrders).toHaveLength(0);
    expect(state.bots[0].status).toBe("processing");
    expect(state.bots[0].currentOrder?.id).toBe(1);
  });

  it("removing the newest processing bot returns its order to the priority queue", () => {
    let state = createInitialState();

    state = reduce(state, { type: "add-order", orderType: "normal", now: 0 });
    state = reduce(state, { type: "add-order", orderType: "normal", now: 1 });
    state = reduce(state, { type: "add-bot", now: 2 });
    state = reduce(state, { type: "remove-bot", now: 3 });

    expect(state.bots).toHaveLength(0);
    expect(state.pendingOrders.map((order) => order.id)).toEqual([1, 2]);
  });
});
