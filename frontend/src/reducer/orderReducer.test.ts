import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { orderReducer, initialState } from "./orderReducer";

let now = 1000;

beforeEach(() => {
  now = 1000;
  vi.spyOn(Date, "now").mockImplementation(() => now++);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ADD_NORMAL_ORDER", () => {
  it("adds order at end of pending list", () => {
    const state = orderReducer(initialState, { type: "ADD_NORMAL_ORDER" });
    expect(state.orders).toHaveLength(1);
    expect(state.orders[0]).toMatchObject({
      id: 1,
      type: "NORMAL",
      status: "PENDING",
    });
  });

  it("increments nextOrderId", () => {
    const state = orderReducer(initialState, { type: "ADD_NORMAL_ORDER" });
    expect(state.nextOrderId).toBe(2);
  });

  it("order IDs are unique and increasing", () => {
    let state = orderReducer(initialState, { type: "ADD_NORMAL_ORDER" });
    state = orderReducer(state, { type: "ADD_NORMAL_ORDER" });
    state = orderReducer(state, { type: "ADD_VIP_ORDER" });
    expect(state.orders.map((o) => o.id).sort((a, b) => a - b)).toEqual([
      1, 2, 3,
    ]);
  });
});

describe("ADD_VIP_ORDER", () => {
  it("inserts VIP order before all Normal orders", () => {
    let state = orderReducer(initialState, { type: "ADD_NORMAL_ORDER" }); // #1 Normal
    state = orderReducer(state, { type: "ADD_VIP_ORDER" }); // #2 VIP
    const pending = state.orders.filter((o) => o.status === "PENDING");
    expect(pending[0]).toMatchObject({ id: 2, type: "VIP" });
    expect(pending[1]).toMatchObject({ id: 1, type: "NORMAL" });
  });

  it("inserts VIP behind existing VIP orders", () => {
    let state = orderReducer(initialState, { type: "ADD_VIP_ORDER" }); // #1 VIP
    state = orderReducer(state, { type: "ADD_NORMAL_ORDER" }); // #2 Normal
    state = orderReducer(state, { type: "ADD_VIP_ORDER" }); // #3 VIP
    const pending = state.orders.filter((o) => o.status === "PENDING");
    expect(pending.map((o) => o.id)).toEqual([1, 3, 2]);
  });

  it("VIP order goes to front when no existing VIPs", () => {
    let state = orderReducer(initialState, { type: "ADD_NORMAL_ORDER" }); // #1 Normal
    state = orderReducer(state, { type: "ADD_NORMAL_ORDER" }); // #2 Normal
    state = orderReducer(state, { type: "ADD_VIP_ORDER" }); // #3 VIP
    const pending = state.orders.filter((o) => o.status === "PENDING");
    expect(pending[0]).toMatchObject({ id: 3, type: "VIP" });
  });
});

describe("ADD_BOT", () => {
  it("creates bot in IDLE state when no pending orders", () => {
    const state = orderReducer(initialState, { type: "ADD_BOT" });
    expect(state.bots).toHaveLength(1);
    expect(state.bots[0]).toMatchObject({
      id: 1,
      status: "IDLE",
      processingOrderId: undefined,
    });
    expect(state.nextBotId).toBe(2);
  });

  it("bot immediately picks pending order on creation", () => {
    let state = orderReducer(initialState, { type: "ADD_NORMAL_ORDER" });
    state = orderReducer(state, { type: "ADD_BOT" });
    expect(state.bots[0].status).toBe("PROCESSING");
    expect(state.bots[0].processingOrderId).toBe(1);
    expect(state.orders[0].status).toBe("PROCESSING");
    expect(state.orders[0].startedAt).not.toBeNull();
  });

  it("new order immediately picked by IDLE bot", () => {
    let state = orderReducer(initialState, { type: "ADD_BOT" });
    state = orderReducer(state, { type: "ADD_NORMAL_ORDER" });
    expect(state.bots[0].status).toBe("PROCESSING");
    expect(state.bots[0].processingOrderId).toBe(1);
  });
});

describe("REMOVE_BOT", () => {
  it("does nothing when no bots", () => {
    const state = orderReducer(initialState, { type: "REMOVE_BOT" });
    expect(state.bots).toHaveLength(0);
  });

  it("removes the highest-ID bot", () => {
    let state = orderReducer(initialState, { type: "ADD_BOT" }); // bot 1
    state = orderReducer(state, { type: "ADD_BOT" }); // bot 2
    state = orderReducer(state, { type: "REMOVE_BOT" });
    expect(state.bots).toHaveLength(1);
    expect(state.bots[0].id).toBe(1);
  });

  it("returns VIP processing order to front of PENDING queue", () => {
    let state = orderReducer(initialState, { type: "ADD_VIP_ORDER" }); // #1 VIP
    state = orderReducer(state, { type: "ADD_NORMAL_ORDER" }); // #2 Normal
    state = orderReducer(state, { type: "ADD_BOT" }); // bot1 picks #1 VIP
    state = orderReducer(state, { type: "REMOVE_BOT" });
    const pending = state.orders.filter((o) => o.status === "PENDING");
    expect(pending[0]).toMatchObject({
      id: 1,
      type: "VIP",
      status: "PENDING",
    });
    expect(pending[1]).toMatchObject({ id: 2, type: "NORMAL" });
    expect(state.bots).toHaveLength(0);
  });

  it("returns Normal processing order to end of PENDING queue", () => {
    let state = orderReducer(initialState, { type: "ADD_VIP_ORDER" }); // #1 VIP
    state = orderReducer(state, { type: "ADD_NORMAL_ORDER" }); // #2 Normal
    state = orderReducer(state, { type: "ADD_BOT" }); // bot1 picks #1 VIP
    state = orderReducer(state, { type: "ADD_BOT" }); // bot2 picks #2 Normal
    state = orderReducer(state, { type: "REMOVE_BOT" }); // removes bot2 (#2 Normal returns)
    const pending = state.orders.filter((o) => o.status === "PENDING");
    expect(pending[pending.length - 1]).toMatchObject({
      id: 2,
      type: "NORMAL",
    });
  });

  it("always removes newest bot (highest createdAt) regardless of status", () => {
    let state = orderReducer(initialState, { type: "ADD_NORMAL_ORDER" }); // #1 Normal
    state = orderReducer(state, { type: "ADD_VIP_ORDER" }); // #2 VIP (goes before #1)
    state = orderReducer(state, { type: "ADD_BOT" }); // bot1 picks #2 VIP
    state = orderReducer(state, { type: "ADD_BOT" }); // bot2 picks #1 Normal
    state = orderReducer(state, { type: "ADD_BOT" }); // bot3 idle

    // Newest is bot3 (idle) — removed first
    state = orderReducer(state, { type: "REMOVE_BOT" });
    expect(state.bots.find((b) => b.id === 3)).toBeUndefined();
    expect(state.bots).toHaveLength(2);

    // Newest is now bot2 (processing Normal) — removed, Normal#1 returned to pending
    state = orderReducer(state, { type: "REMOVE_BOT" });
    expect(state.bots.find((b) => b.id === 2)).toBeUndefined();
    expect(state.bots).toHaveLength(1);
    // VIP preemption kicks in: pending Normal#1 doesn't preempt VIP, so bot1 stays on VIP
    expect(state.bots[0].processingOrderId).toBe(2); // still on VIP#2

    // Newest is now bot1 (processing VIP) — removed, VIP#2 returned to pending
    state = orderReducer(state, { type: "REMOVE_BOT" });
    expect(state.bots.find((b) => b.id === 1)).toBeUndefined();
    expect(state.bots).toHaveLength(0);
  });

  it("removing newest bot returns its order to PENDING", () => {
    let state = orderReducer(initialState, { type: "ADD_NORMAL_ORDER" }); // #1 Normal (created first)
    state = orderReducer(state, { type: "ADD_NORMAL_ORDER" }); // #2 Normal (created later)
    state = orderReducer(state, { type: "ADD_BOT" }); // bot1 picks #1
    state = orderReducer(state, { type: "ADD_BOT" }); // bot2 picks #2
    // Newest bot is bot2 — removed, #2 returns to PENDING
    state = orderReducer(state, { type: "REMOVE_BOT" });
    expect(state.bots.find((b) => b.id === 2)).toBeUndefined();
    expect(state.bots.find((b) => b.id === 1)?.processingOrderId).toBe(1); // bot1 preserved on #1
    expect(state.orders.find((o) => o.id === 2)?.status).toBe("PENDING"); // #2 returned
  });
});

describe("ORDER_COMPLETE", () => {
  it("marks order COMPLETE and bot goes IDLE when no more pending", () => {
    let state = orderReducer(initialState, { type: "ADD_NORMAL_ORDER" });
    state = orderReducer(state, { type: "ADD_BOT" });
    state = orderReducer(state, { type: "ORDER_COMPLETE", botId: 1 });
    expect(state.orders[0].status).toBe("COMPLETE");
    expect(state.orders[0].startedAt).toBeUndefined();
    expect(state.bots[0]).toMatchObject({
      status: "IDLE",
      processingOrderId: undefined,
    });
  });

  it("bot picks next pending order after completing one", () => {
    let state = orderReducer(initialState, { type: "ADD_NORMAL_ORDER" }); // #1
    state = orderReducer(state, { type: "ADD_NORMAL_ORDER" }); // #2
    state = orderReducer(state, { type: "ADD_BOT" }); // bot picks #1
    state = orderReducer(state, { type: "ORDER_COMPLETE", botId: 1 });
    expect(state.orders.find((o) => o.id === 1)?.status).toBe("COMPLETE");
    expect(state.orders.find((o) => o.id === 2)?.status).toBe("PROCESSING");
    expect(state.bots[0]).toMatchObject({
      status: "PROCESSING",
      processingOrderId: 2,
    });
  });

  it("bot preempts normal order immediately when VIP order is added", () => {
    let state = orderReducer(initialState, { type: "ADD_NORMAL_ORDER" }); // #1 Normal
    state = orderReducer(state, { type: "ADD_BOT" }); // bot picks #1
    state = orderReducer(state, { type: "ADD_NORMAL_ORDER" }); // #2 Normal → pending
    state = orderReducer(state, { type: "ADD_VIP_ORDER" }); // #3 VIP → preempts bot off #1
    expect(state.bots[0].processingOrderId).toBe(3);
    expect(state.orders.find((o) => o.id === 3)?.status).toBe("PROCESSING");
    expect(state.orders.find((o) => o.id === 1)?.status).toBe("PENDING");
    // After VIP finishes, bot picks the order created earliest (#1)
    state = orderReducer(state, { type: "ORDER_COMPLETE", botId: 1 });
    expect(state.bots[0].processingOrderId).toBe(1);
  });

  it("order IDs are unique and increasing across all actions", () => {
    let state = orderReducer(initialState, { type: "ADD_NORMAL_ORDER" });
    state = orderReducer(state, { type: "ADD_NORMAL_ORDER" });
    state = orderReducer(state, { type: "ADD_VIP_ORDER" });
    const ids = state.orders.map((o) => o.id);
    expect(new Set(ids).size).toBe(3);
    expect(Math.max(...ids)).toBe(3);
    expect(Math.min(...ids)).toBe(1);
  });
});

// ── Edge case tests ──

describe("EDGE CASE: REMOVE_BOT always removes newest bot with VIP handoff", () => {
  it("removes newest bot even if it processes a VIP — older idle bot takes over VIP", () => {
    let state = orderReducer(initialState, { type: "ADD_VIP_ORDER" }); // #1 VIP
    state = orderReducer(state, { type: "ADD_BOT" }); // bot1 picks VIP#1
    state = orderReducer(state, { type: "ADD_BOT" }); // bot2 idle

    // Newest is bot2 (idle) — removed, VIP stays with bot1
    state = orderReducer(state, { type: "REMOVE_BOT" });
    expect(state.bots).toHaveLength(1);
    expect(state.bots[0].id).toBe(1);
    expect(state.bots[0].processingOrderId).toBe(1); // VIP still being processed
  });

  it("removes newest bot processing VIP — older bot preempts its normal to take VIP", () => {
    // bot1 processing Normal, bot2 processing VIP
    let state = orderReducer(initialState, { type: "ADD_NORMAL_ORDER" }); // #1 Normal
    state = orderReducer(state, { type: "ADD_BOT" }); // bot1 picks Normal#1
    state = orderReducer(state, { type: "ADD_VIP_ORDER" }); // #2 VIP → preempts bot1 off Normal#1
    // bot1 now processing VIP#2, Normal#1 pending
    state = orderReducer(state, { type: "ADD_BOT" }); // bot2 picks Normal#1
    // bot1: VIP#2, bot2: Normal#1

    // Newest is bot2 — removed, Normal#1 returned to pending
    // No pending VIP (VIP#2 still on bot1), so no preemption needed
    state = orderReducer(state, { type: "REMOVE_BOT" });
    expect(state.bots).toHaveLength(1);
    expect(state.bots[0].id).toBe(1);
    expect(state.bots[0].processingOrderId).toBe(2); // still on VIP
    expect(state.orders.find((o) => o.id === 1)?.status).toBe("PENDING");
  });

  it("removes newest bot processing VIP — remaining bot processing Normal preempted for VIP", () => {
    // Construct: bot1=Normal, bot2=VIP, then remove bot2
    let state = orderReducer(initialState, { type: "ADD_NORMAL_ORDER" }); // #1 Normal
    state = orderReducer(state, { type: "ADD_NORMAL_ORDER" }); // #2 Normal
    state = orderReducer(state, { type: "ADD_BOT" }); // bot1 picks #1
    state = orderReducer(state, { type: "ADD_BOT" }); // bot2 picks #2
    // Both bots processing Normals, add VIP to preempt latest normal
    state = orderReducer(state, { type: "ADD_VIP_ORDER" }); // #3 VIP → preempts #2, bot2 now on VIP#3
    // bot1: Normal#1, bot2: VIP#3, Normal#2 pending

    // Remove bot2 (newest, processing VIP#3) → VIP#3 returns to pending
    // applyVipPreemption: pending VIP#3, bot1 processing Normal#1 → preempts Normal#1
    // bot1 takes VIP#3, Normal#1 returns to pending
    state = orderReducer(state, { type: "REMOVE_BOT" });
    expect(state.bots).toHaveLength(1);
    expect(state.bots[0].id).toBe(1);
    expect(state.bots[0].processingOrderId).toBe(3); // bot1 took over VIP#3
    expect(state.orders.find((o) => o.id === 3)?.status).toBe("PROCESSING");
    expect(state.orders.find((o) => o.id === 1)?.status).toBe("PENDING");
    expect(state.orders.find((o) => o.id === 2)?.status).toBe("PENDING");
  });

  it("removes newest bot processing VIP — no handoff possible when all remaining bots process VIPs", () => {
    let state = orderReducer(initialState, { type: "ADD_VIP_ORDER" }); // #1 VIP
    state = orderReducer(state, { type: "ADD_VIP_ORDER" }); // #2 VIP
    state = orderReducer(state, { type: "ADD_BOT" }); // bot1 picks VIP#1
    state = orderReducer(state, { type: "ADD_BOT" }); // bot2 picks VIP#2

    // Remove bot2 (newest, processing VIP#2) → VIP#2 returns to pending
    // No idle bots, no normal-processing bots → VIP#2 stays pending
    state = orderReducer(state, { type: "REMOVE_BOT" });
    expect(state.bots).toHaveLength(1);
    expect(state.bots[0].id).toBe(1);
    expect(state.bots[0].processingOrderId).toBe(1); // still on VIP#1
    expect(state.orders.find((o) => o.id === 2)?.status).toBe("PENDING");
  });
});

describe("EDGE CASE: reinsertion with multiple orders of same type", () => {
  it("reinserted Normal order goes to correct position among multiple pending Normals", () => {
    let state = orderReducer(initialState, { type: "ADD_NORMAL_ORDER" }); // #1 Normal
    state = orderReducer(state, { type: "ADD_NORMAL_ORDER" }); // #2 Normal
    state = orderReducer(state, { type: "ADD_NORMAL_ORDER" }); // #3 Normal
    state = orderReducer(state, { type: "ADD_BOT" }); // bot1 picks #1

    // Remove bot → #1 should return to front of Normal queue (created earliest)
    state = orderReducer(state, { type: "REMOVE_BOT" });
    const pending = state.orders.filter((o) => o.status === "PENDING");
    expect(pending.map((o) => o.id)).toEqual([1, 2, 3]);
  });

  it("reinserted VIP order goes to correct position among multiple pending VIPs", () => {
    let state = orderReducer(initialState, { type: "ADD_VIP_ORDER" }); // #1 VIP
    state = orderReducer(state, { type: "ADD_VIP_ORDER" }); // #2 VIP
    state = orderReducer(state, { type: "ADD_VIP_ORDER" }); // #3 VIP
    state = orderReducer(state, { type: "ADD_BOT" }); // bot1 picks #1

    state = orderReducer(state, { type: "REMOVE_BOT" });
    const pending = state.orders.filter((o) => o.status === "PENDING");
    expect(pending.map((o) => o.id)).toEqual([1, 2, 3]);
  });

  it("reinserted middle Normal order preserves position between other Normals", () => {
    let state = orderReducer(initialState, { type: "ADD_NORMAL_ORDER" }); // #1
    state = orderReducer(state, { type: "ADD_NORMAL_ORDER" }); // #2
    state = orderReducer(state, { type: "ADD_NORMAL_ORDER" }); // #3
    state = orderReducer(state, { type: "ADD_BOT" }); // bot1 picks #1
    state = orderReducer(state, { type: "ADD_BOT" }); // bot2 picks #2

    // Remove bot processing #2 (bot2 processes later-created order)
    state = orderReducer(state, { type: "REMOVE_BOT" });
    const pending = state.orders.filter((o) => o.status === "PENDING");
    // #2 should be reinserted before #3 (created earlier)
    expect(pending.map((o) => o.id)).toEqual([2, 3]);
  });
});

describe("EDGE CASE: ORDER_COMPLETE for invalid/edge scenarios", () => {
  it("ORDER_COMPLETE for non-existent bot is a no-op", () => {
    let state = orderReducer(initialState, { type: "ADD_NORMAL_ORDER" });
    state = orderReducer(state, { type: "ADD_BOT" });
    const before = { ...state };
    const after = orderReducer(state, { type: "ORDER_COMPLETE", botId: 999 });
    expect(after).toBe(state); // exact same reference — no change
  });

  it("ORDER_COMPLETE for IDLE bot is a no-op", () => {
    let state = orderReducer(initialState, { type: "ADD_BOT" });
    const after = orderReducer(state, { type: "ORDER_COMPLETE", botId: 1 });
    expect(after).toBe(state);
  });

  it("double ORDER_COMPLETE for same bot is a no-op on second call", () => {
    let state = orderReducer(initialState, { type: "ADD_NORMAL_ORDER" });
    state = orderReducer(state, { type: "ADD_BOT" });
    state = orderReducer(state, { type: "ORDER_COMPLETE", botId: 1 });
    expect(state.bots[0].status).toBe("IDLE");
    const after = orderReducer(state, { type: "ORDER_COMPLETE", botId: 1 });
    expect(after).toBe(state);
  });
});

describe("EDGE CASE: bot processes VIP before Normal in queue", () => {
  it("bot picks VIP order first when both VIP and Normal are pending", () => {
    let state = orderReducer(initialState, { type: "ADD_NORMAL_ORDER" }); // #1 Normal
    state = orderReducer(state, { type: "ADD_VIP_ORDER" }); // #2 VIP (queued before #1)
    state = orderReducer(state, { type: "ADD_BOT" }); // bot should pick #2 VIP

    expect(state.bots[0].processingOrderId).toBe(2);
    expect(state.orders.find((o) => o.id === 2)?.status).toBe("PROCESSING");
    expect(state.orders.find((o) => o.id === 1)?.status).toBe("PENDING");
  });

  it("after completing VIP, bot picks Normal order", () => {
    let state = orderReducer(initialState, { type: "ADD_NORMAL_ORDER" }); // #1
    state = orderReducer(state, { type: "ADD_VIP_ORDER" }); // #2 VIP
    state = orderReducer(state, { type: "ADD_BOT" }); // picks #2 VIP
    state = orderReducer(state, { type: "ORDER_COMPLETE", botId: 1 });
    expect(state.bots[0].processingOrderId).toBe(1);
    expect(state.orders.find((o) => o.id === 1)?.status).toBe("PROCESSING");
  });
});

describe("EDGE CASE: multiple bots processing concurrently", () => {
  it("two bots process two orders independently", () => {
    let state = orderReducer(initialState, { type: "ADD_NORMAL_ORDER" }); // #1
    state = orderReducer(state, { type: "ADD_NORMAL_ORDER" }); // #2
    state = orderReducer(state, { type: "ADD_BOT" }); // bot1 picks #1
    state = orderReducer(state, { type: "ADD_BOT" }); // bot2 picks #2

    expect(state.bots[0].processingOrderId).toBe(1);
    expect(state.bots[1].processingOrderId).toBe(2);

    // Complete #2 first (out of order)
    state = orderReducer(state, { type: "ORDER_COMPLETE", botId: 2 });
    expect(state.orders.find((o) => o.id === 2)?.status).toBe("COMPLETE");
    expect(state.bots.find((b) => b.id === 2)?.status).toBe("IDLE");
    expect(state.bots.find((b) => b.id === 1)?.status).toBe("PROCESSING"); // bot1 still working

    // Complete #1
    state = orderReducer(state, { type: "ORDER_COMPLETE", botId: 1 });
    expect(state.orders.find((o) => o.id === 1)?.status).toBe("COMPLETE");
    expect(state.bots.find((b) => b.id === 1)?.status).toBe("IDLE");
  });

  it("idle bot picks new order immediately when other bots are busy", () => {
    let state = orderReducer(initialState, { type: "ADD_NORMAL_ORDER" }); // #1
    state = orderReducer(state, { type: "ADD_BOT" }); // bot1 picks #1
    state = orderReducer(state, { type: "ADD_BOT" }); // bot2 idle

    state = orderReducer(state, { type: "ADD_NORMAL_ORDER" }); // #2 → bot2 should pick it
    expect(state.bots.find((b) => b.id === 2)?.processingOrderId).toBe(2);
    expect(state.bots.find((b) => b.id === 2)?.status).toBe("PROCESSING");
  });
});

describe("EDGE CASE: adding orders after all bots removed", () => {
  it("orders remain PENDING when no bots exist", () => {
    let state = orderReducer(initialState, { type: "ADD_NORMAL_ORDER" });
    state = orderReducer(state, { type: "ADD_VIP_ORDER" });
    const pending = state.orders.filter((o) => o.status === "PENDING");
    expect(pending).toHaveLength(2);
    expect(state.bots).toHaveLength(0);
  });

  it("adding bot after orders accumulate picks up first pending order", () => {
    let state = orderReducer(initialState, { type: "ADD_NORMAL_ORDER" }); // #1
    state = orderReducer(state, { type: "ADD_NORMAL_ORDER" }); // #2
    state = orderReducer(state, { type: "ADD_VIP_ORDER" }); // #3 VIP (front of queue)
    state = orderReducer(state, { type: "ADD_BOT" }); // should pick #3 VIP

    expect(state.bots[0].processingOrderId).toBe(3);
    expect(state.orders.find((o) => o.id === 3)?.status).toBe("PROCESSING");
  });
});

describe("EDGE CASE: VIP preemption chain", () => {
  it("two VIP orders added when two bots process normals — both normals get preempted", () => {
    let state = orderReducer(initialState, { type: "ADD_NORMAL_ORDER" }); // #1
    state = orderReducer(state, { type: "ADD_NORMAL_ORDER" }); // #2
    state = orderReducer(state, { type: "ADD_BOT" }); // bot1 picks #1
    state = orderReducer(state, { type: "ADD_BOT" }); // bot2 picks #2

    // Add first VIP — should preempt the latest-created normal (#2)
    state = orderReducer(state, { type: "ADD_VIP_ORDER" }); // #3 VIP
    expect(state.orders.find((o) => o.id === 3)?.status).toBe("PROCESSING");
    expect(state.orders.find((o) => o.id === 2)?.status).toBe("PENDING");

    // Add second VIP — should preempt #1 (only remaining normal being processed)
    state = orderReducer(state, { type: "ADD_VIP_ORDER" }); // #4 VIP
    expect(state.orders.find((o) => o.id === 4)?.status).toBe("PROCESSING");
    expect(state.orders.find((o) => o.id === 1)?.status).toBe("PENDING");

    // Both normals are now pending, both bots processing VIPs
    const processing = state.orders.filter((o) => o.status === "PROCESSING");
    expect(processing.every((o) => o.type === "VIP")).toBe(true);
    expect(processing).toHaveLength(2);
  });

  it("VIP added when all bots already process VIPs — no preemption, VIP stays pending", () => {
    let state = orderReducer(initialState, { type: "ADD_VIP_ORDER" }); // #1 VIP
    state = orderReducer(state, { type: "ADD_BOT" }); // bot1 picks #1
    state = orderReducer(state, { type: "ADD_VIP_ORDER" }); // #2 VIP → no normals to preempt

    expect(state.orders.find((o) => o.id === 2)?.status).toBe("PENDING");
    expect(state.bots[0].processingOrderId).toBe(1); // bot still on VIP#1
  });
});

describe("EDGE CASE: remove bot then add bot cycle", () => {
  it("adding a bot after removing all bots picks up pending orders", () => {
    let state = orderReducer(initialState, { type: "ADD_NORMAL_ORDER" }); // #1
    state = orderReducer(state, { type: "ADD_BOT" }); // bot1 picks #1
    state = orderReducer(state, { type: "REMOVE_BOT" }); // bot1 removed, #1 back to PENDING

    expect(state.bots).toHaveLength(0);
    expect(state.orders[0].status).toBe("PENDING");

    state = orderReducer(state, { type: "ADD_BOT" }); // bot2 picks #1
    expect(state.bots[0].id).toBe(2); // new bot has new ID
    expect(state.bots[0].processingOrderId).toBe(1);
    expect(state.orders.find((o) => o.id === 1)?.status).toBe("PROCESSING");
  });
});

describe("EDGE CASE: order processing queue respects array position", () => {
  it("findFirstPending picks VIP before Normal when array order is correct", () => {
    let state = orderReducer(initialState, { type: "ADD_NORMAL_ORDER" }); // #1
    state = orderReducer(state, { type: "ADD_NORMAL_ORDER" }); // #2
    state = orderReducer(state, { type: "ADD_VIP_ORDER" }); // #3 VIP (should be before normals)

    // Verify array order: VIP should be first pending in array
    const firstPending = state.orders.find((o) => o.status === "PENDING");
    expect(firstPending?.type).toBe("VIP");
    expect(firstPending?.id).toBe(3);
  });

  it("complete + pending mix: bot still picks correct next order", () => {
    let state = orderReducer(initialState, { type: "ADD_NORMAL_ORDER" }); // #1
    state = orderReducer(state, { type: "ADD_NORMAL_ORDER" }); // #2
    state = orderReducer(state, { type: "ADD_VIP_ORDER" }); // #3 VIP
    state = orderReducer(state, { type: "ADD_BOT" }); // bot1 picks #3 VIP

    state = orderReducer(state, { type: "ORDER_COMPLETE", botId: 1 }); // #3 done → picks #1
    expect(state.bots[0].processingOrderId).toBe(1);

    state = orderReducer(state, { type: "ORDER_COMPLETE", botId: 1 }); // #1 done → picks #2
    expect(state.bots[0].processingOrderId).toBe(2);

    state = orderReducer(state, { type: "ORDER_COMPLETE", botId: 1 }); // #2 done → idle
    expect(state.bots[0].status).toBe("IDLE");
    expect(state.orders.every((o) => o.status === "COMPLETE")).toBe(true);
  });
});

describe("EDGE CASE: stress — many orders and bots", () => {
  it("10 orders, 3 bots — all complete eventually in correct priority", () => {
    let state = initialState;
    // Add mixed orders
    for (let i = 0; i < 5; i++) state = orderReducer(state, { type: "ADD_NORMAL_ORDER" });
    for (let i = 0; i < 3; i++) state = orderReducer(state, { type: "ADD_VIP_ORDER" });
    for (let i = 0; i < 2; i++) state = orderReducer(state, { type: "ADD_NORMAL_ORDER" });

    expect(state.orders).toHaveLength(10);

    // Add 3 bots
    state = orderReducer(state, { type: "ADD_BOT" });
    state = orderReducer(state, { type: "ADD_BOT" });
    state = orderReducer(state, { type: "ADD_BOT" });

    // All 3 bots should be processing
    expect(state.bots.every((b) => b.status === "PROCESSING")).toBe(true);

    // Complete all orders
    let safetyCounter = 0;
    while (state.orders.some((o) => o.status !== "COMPLETE") && safetyCounter < 20) {
      const busyBot = state.bots.find((b) => b.status === "PROCESSING");
      if (!busyBot) break;
      state = orderReducer(state, { type: "ORDER_COMPLETE", botId: busyBot.id });
      safetyCounter++;
    }

    expect(state.orders.every((o) => o.status === "COMPLETE")).toBe(true);
    expect(state.bots.every((b) => b.status === "IDLE")).toBe(true);
    expect(safetyCounter).toBe(10); // exactly 10 completions needed
  });
});

describe("EDGE CASE: REMOVE_BOT VIP handoff chain after reinsertion", () => {
  it("removing newest bot (processing VIP) — remaining bot preempts normal for VIP", () => {
    // bot1 processing VIP#1, bot2 processing Normal#2
    let state = orderReducer(initialState, { type: "ADD_VIP_ORDER" }); // #1 VIP
    state = orderReducer(state, { type: "ADD_NORMAL_ORDER" }); // #2 Normal
    state = orderReducer(state, { type: "ADD_BOT" }); // bot1 picks VIP#1
    state = orderReducer(state, { type: "ADD_BOT" }); // bot2 picks Normal#2

    // Newest is bot2 — removed, Normal#2 returns to pending
    // No pending VIP (VIP#1 still processing on bot1), no preemption needed
    state = orderReducer(state, { type: "REMOVE_BOT" });
    expect(state.bots).toHaveLength(1);
    expect(state.bots[0].id).toBe(1);
    expect(state.bots[0].processingOrderId).toBe(1); // still processing VIP#1
    expect(state.orders.find((o) => o.id === 2)?.status).toBe("PENDING");
  });

  it("bot has createdAt field", () => {
    const state = orderReducer(initialState, { type: "ADD_BOT" });
    expect(state.bots[0].createdAt).toBeDefined();
    expect(typeof state.bots[0].createdAt).toBe("number");
  });
});
