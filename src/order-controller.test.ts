import { describe, expect, it } from "vite-plus/test";
import { createInitialState, PROCESSING_MS, reducer, type State } from "./order-controller";

const START = Date.UTC(2026, 5, 19, 12, 0, 0);

function apply(state: State, actions: Parameters<typeof reducer>[1][]): State {
  return actions.reduce(reducer, state);
}

describe("order controller", () => {
  it("assigns unique increasing order numbers", () => {
    const state = apply(createInitialState(START), [
      { type: "add-order", kind: "normal", now: START },
      { type: "add-order", kind: "vip", now: START + 1 },
      { type: "add-order", kind: "normal", now: START + 2 },
    ]);

    expect([...state.pending.map((order) => order.id), state.nextOrderId]).toEqual([2, 1, 3, 4]);
  });

  it("queues VIP orders behind existing VIP orders and ahead of normal orders", () => {
    const state = apply(createInitialState(START), [
      { type: "add-order", kind: "normal", now: START },
      { type: "add-order", kind: "vip", now: START + 1 },
      { type: "add-order", kind: "normal", now: START + 2 },
      { type: "add-order", kind: "vip", now: START + 3 },
    ]);

    expect(state.pending.map((order) => `${order.kind}-${order.id}`)).toEqual([
      "vip-2",
      "vip-4",
      "normal-1",
      "normal-3",
    ]);
  });

  it("starts a new bot immediately when pending orders exist", () => {
    const state = apply(createInitialState(START), [
      { type: "add-order", kind: "normal", now: START },
      { type: "add-bot", now: START + 100 },
    ]);

    expect(state.pending).toHaveLength(0);
    expect(state.bots).toMatchObject([
      {
        id: 1,
        status: "processing",
        order: { id: 1, startedAt: START + 100 },
        startedAt: START + 100,
        finishAt: START + 100 + PROCESSING_MS,
      },
    ]);
  });

  it("keeps a bot idle when no pending order exists and starts it when an order arrives", () => {
    const idle = reducer(createInitialState(START), { type: "add-bot", now: START });

    expect(idle.bots).toEqual([{ id: 1, status: "idle" }]);

    const processing = reducer(idle, { type: "add-order", kind: "vip", now: START + 500 });

    expect(processing.pending).toHaveLength(0);
    expect(processing.bots[0]).toMatchObject({
      status: "processing",
      order: { id: 1, kind: "vip" },
    });
  });

  it("moves an order to complete after 10 seconds and starts the next pending order", () => {
    const cooking = apply(createInitialState(START), [
      { type: "add-order", kind: "normal", now: START },
      { type: "add-order", kind: "vip", now: START + 1 },
      { type: "add-bot", now: START + 100 },
    ]);

    const finished = reducer(cooking, {
      type: "complete-order",
      botId: 1,
      now: START + 100 + PROCESSING_MS,
    });

    expect(finished.completed.map((order) => order.id)).toEqual([2]);
    expect(finished.pending).toHaveLength(0);
    expect(finished.bots[0]).toMatchObject({ status: "processing", order: { id: 1 } });
  });

  it("does not complete an order before 10 seconds", () => {
    const cooking = apply(createInitialState(START), [
      { type: "add-order", kind: "normal", now: START },
      { type: "add-bot", now: START },
    ]);

    const beforeFinish = reducer(cooking, {
      type: "complete-order",
      botId: 1,
      now: START + PROCESSING_MS - 1,
    });

    expect(beforeFinish.completed).toHaveLength(0);
    expect(beforeFinish.bots[0]).toMatchObject({ status: "processing", order: { id: 1 } });
  });

  it("ignores stale completion events for removed bots", () => {
    const cooking = apply(createInitialState(START), [
      { type: "add-order", kind: "normal", now: START },
      { type: "add-bot", now: START },
    ]);

    const removed = reducer(cooking, { type: "remove-bot", now: START + 100 });
    const staleCompletion = reducer(removed, {
      type: "complete-order",
      botId: 1,
      now: START + PROCESSING_MS,
    });

    expect(staleCompletion).toMatchObject({
      bots: [],
      completed: [],
      pending: [{ id: 1, kind: "normal" }],
    });
  });

  it("does nothing except advance time when removing a bot from an empty kitchen", () => {
    const initial = createInitialState(START);

    const afterRemove = reducer(initial, { type: "remove-bot", now: START + 123 });

    expect(afterRemove).toEqual({ ...initial, now: START + 123 });
  });

  it("removes the newest idle bot without changing active work", () => {
    const cooking = apply(createInitialState(START), [
      { type: "add-bot", now: START },
      { type: "add-bot", now: START + 1 },
      { type: "add-order", kind: "normal", now: START + 2 },
    ]);

    const afterRemove = reducer(cooking, { type: "remove-bot", now: START + 300 });

    expect(afterRemove.pending).toHaveLength(0);
    expect(afterRemove.bots).toMatchObject([
      { id: 1, status: "processing", order: { id: 1, kind: "normal" } },
    ]);
    expect(afterRemove.events[0]).toContain("Idle bot #2 was removed.");
  });

  it("keeps only the 10 newest events", () => {
    const state = apply(
      createInitialState(START),
      Array.from({ length: 11 }, (_, index) => ({
        type: "add-order" as const,
        kind: "normal" as const,
        now: START + index,
      })),
    );

    expect(state.events).toHaveLength(10);
    expect(state.events[0]).toContain("Order #11 entered pending.");
    expect(state.events.at(-1)).toContain("Order #2 entered pending.");
  });

  it("ignores completions for other bots", () => {
    const cooking = apply(createInitialState(START), [
      { type: "add-order", kind: "normal", now: START },
      { type: "add-bot", now: START },
    ]);

    const ignored = reducer(cooking, {
      type: "complete-order",
      botId: 999,
      now: START + PROCESSING_MS,
    });

    expect(ignored.completed).toHaveLength(0);
    expect(ignored.bots[0]).toMatchObject({ status: "processing", order: { id: 1 } });
  });

  it("removes the newest bot and returns its processing order to the priority queue", () => {
    const cooking = apply(createInitialState(START), [
      { type: "add-order", kind: "normal", now: START },
      { type: "add-order", kind: "normal", now: START + 1 },
      { type: "add-order", kind: "vip", now: START + 2 },
      { type: "add-bot", now: START + 100 },
      { type: "add-bot", now: START + 200 },
    ]);

    expect(cooking.bots.map((bot) => bot.status === "processing" && bot.order.id)).toEqual([3, 1]);

    const afterRemove = reducer(cooking, { type: "remove-bot", now: START + 300 });

    expect(afterRemove.bots).toHaveLength(1);
    expect(afterRemove.bots[0]).toMatchObject({ id: 1, status: "processing", order: { id: 3 } });
    expect(afterRemove.pending.map((order) => order.id)).toEqual([1, 2]);
  });
});
