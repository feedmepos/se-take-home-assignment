const {
  createOrder,
  addBot,
  removeBot,
  resetState,
  getState,
} = require("./index");

describe("McDonald's Functional Tests", () => {
  beforeEach(() => {
    resetState();
    jest.useFakeTimers();
  });

  test("VIP order should jump ahead of Normal order", () => {
    createOrder("NORMAL");
    createOrder("VIP");
    // Call the function to get the current array
    const currentState = getState();
    expect(currentState.orders[0].type).toBe("VIP");
  });

  test("Bot should complete order after 10 seconds", () => {
    createOrder("NORMAL");
    addBot();
    jest.advanceTimersByTime(10000);

    const currentState = getState();
    expect(currentState.orders[0].status).toBe("COMPLETE");
  });

  test("Removing bot should revert order to PENDING", () => {
    createOrder("NORMAL");
    addBot();
    removeBot();
    const currentState = getState();
    expect(currentState.orders[0].status).toBe("PENDING");
  });

  test("Destroying a bot should remove the most recently added one", () => {
    addBot(); // Bot 1
    addBot(); // Bot 2

    removeBot();

    const { bots } = getState();
    expect(bots.length).toBe(1);
    expect(bots[0].id).toBe(1); // Bot 1 survives, Bot 2 (newest) is destroyed
  });

  test("Bot should wait silently and then wake up on new order", () => {
    // 1. Setup an empty world
    addBot();

    const state1 = getState();
    // PROOF OF IDLE: No task assigned
    expect(state1.bots[0].currentOrderId).toBeNull();

    // 2. Add the order
    createOrder("NORMAL");

    const state2 = getState();
    // PROOF OF REACTION: The bot "woke up" and grabbed Order 1
    expect(state2.bots[0].currentOrderId).toBe(1);
    expect(state2.orders[0].status).toBe("PROCESSING");
  });

  test("Multiple VIPs should maintain their own relative order at the front", () => {
    createOrder("NORMAL"); // ID 1
    createOrder("VIP"); // ID 2
    createOrder("NORMAL"); // ID 3
    createOrder("VIP"); // ID 4

    const { orders } = getState();
    expect(orders[0].id).toBe(2);
    expect(orders[1].id).toBe(4);
    expect(orders[2].id).toBe(1);
    expect(orders[3].id).toBe(3);
  });

  test("A second bot should pick up an order abandoned by a removed bot", () => {
    // 1. Add an order and two bots
    createOrder("NORMAL"); // ID 1
    addBot(); // Bot 1: Starts Order 1
    addBot(); // Bot 2: Idle

    // FIX: Use getState() instead of state
    const stateBefore = getState();
    expect(stateBefore.bots[0].currentOrderId).toBe(1);
    expect(stateBefore.bots[1].currentOrderId).toBeNull();

    // 2. Remove the bots
    removeBot(); // Removes Bot 2 (Idle)
    removeBot(); // Removes Bot 1 (Busy) -> Order 1 reverts to PENDING

    // 3. Add a new bot
    addBot();

    // 4. Verify the new bot picks up the abandoned Order 1
    const stateAfter = getState();
    expect(stateAfter.orders[0].status).toBe("PROCESSING");
    expect(stateAfter.bots[0].currentOrderId).toBe(1);
  });

  test("A single bot should start the next order immediately after finishing the first", () => {
    createOrder("NORMAL"); // ID 1
    createOrder("NORMAL"); // ID 2
    addBot(); // Bot 1 starts ID 1

    // Finish Order 1
    jest.advanceTimersByTime(10000);

    const { orders, bots } = getState();
    expect(orders[0].status).toBe("COMPLETE");

    // Requirement check: Bot should NOT be idle, it should be on Order 2
    expect(orders[1].status).toBe("PROCESSING");
    expect(bots[0].currentOrderId).toBe(2);
  });

  test("VIP order should NOT jump ahead of a Normal order that is already PROCESSING", () => {
    addBot();
    createOrder("NORMAL"); // ID 1 - Starts immediately
    createOrder("VIP"); // ID 2 - Arrives while ID 1 is cooking

    const { orders } = getState();
    expect(orders[0].id).toBe(1); // Normal stays at the front because it's cooking
    expect(orders[1].id).toBe(2); // VIP waits behind the active cook
  });

  test("Should not throw error when removing a bot if no bots exist", () => {
    expect(() => {
      removeBot();
    }).not.toThrow();
  });

  test("Only one bot should pick up an order if multiple bots are idle", () => {
    addBot(); // Bot 1
    addBot(); // Bot 2
    addBot(); // Bot 3

    createOrder("NORMAL");

    const { bots } = getState();
    const busyBots = bots.filter((b) => b.currentOrderId !== null);

    expect(busyBots.length).toBe(1);
    expect(busyBots[0].id).toBe(1); // Usually the first one in the array
  });

  test("Removing a bot at the last second should prevent order completion", () => {
    createOrder("NORMAL");
    addBot();

    // Wait almost the full time
    jest.advanceTimersByTime(9999);
    removeBot();

    // Wait the remaining time
    jest.advanceTimersByTime(1);

    const { orders } = getState();
    expect(orders[0].status).toBe("PENDING"); // Should NOT be COMPLETE
  });

  test("Order IDs should be strictly unique even with mixed types", () => {
    createOrder("NORMAL");
    createOrder("VIP");
    createOrder("NORMAL");

    const { orders } = getState();
    const ids = orders.map((o) => o.id);
    const uniqueIds = new Set(ids);

    // If the sizes match, there are no duplicates
    expect(uniqueIds.size).toBe(ids.length);
    expect(ids).toContain(1);
    expect(ids).toContain(2);
    expect(ids).toContain(3);
  });
});
