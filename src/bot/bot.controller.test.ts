import { BotController } from "./bot.controller";

jest.setTimeout(20000);

describe("BotController", () => {
  test("completes an order in ~10s", async () => {
    const c = new BotController();
    c.createNormalOrder();
    c.addBot();
    await new Promise((res) => setTimeout(res, 10500));
    expect(c.getCompleted().length).toBe(1);
  });

  test("bot ID reuses lowest available after removal", () => {
    const c = new BotController();
    const id1 = c.addBot();
    const id2 = c.addBot();
    expect([id1, id2]).toEqual([1, 2]);
    c.removeBot(); // removes newest (2)
    const id3 = c.addBot();
    expect(id3).toBe(2); // reused
  });

  test("removing when no bots logs message and returns undefined", () => {
    const logs: string[] = [];
    const c = new BotController({ info: (m: string) => logs.push(m) });
    const removed = c.removeBot();
    expect(removed).toBeUndefined();
    expect(logs.some((l) => l.includes("No bots available to remove"))).toBe(
      true
    );
  });

  test("VIP preempts NORMAL in-progress order (returned to queue)", async () => {
    const c = new BotController();
    c.createNormalOrder();
    c.addBot(200); // speed up for test
    await new Promise((res) => setTimeout(res, 50)); // let normal start
    c.createVipOrder();
    await new Promise((res) => setTimeout(res, 600));
    const completed = c.getCompleted();
    expect(completed.length).toBeGreaterThanOrEqual(2);
    expect(completed[0].isVip).toBe(true);
  });

  test("order ids increment uniquely", () => {
    const c = new BotController();
    const o1 = c.createNormalOrder();
    const o2 = c.createVipOrder();
    expect(o1.id).toBe(1);
    expect(o2.id).toBe(2);
  });

  test("adding a bot processes pending immediately", async () => {
    const c = new BotController();
    c.createNormalOrder();
    c.addBot(100);
    await new Promise((res) => setTimeout(res, 150));
    expect(c.getCompleted().length).toBe(1);
  });

  test("single bot does not overlap jobs (second starts after first completes)", async () => {
    const c = new BotController();
    c.createNormalOrder();
    c.createNormalOrder();
    c.addBot(200);
    await new Promise((res) => setTimeout(res, 250));
    const completed = c.getCompleted();
    expect(completed.length).toBe(1);
    // Wait for the second to finish
    await new Promise((res) => setTimeout(res, 250));
    expect(c.getCompleted().length).toBe(2);
  });

  test("removing a busy bot returns the order to pending", async () => {
    const c = new BotController();
    c.createNormalOrder();
    c.addBot(2000);
    await new Promise((res) => setTimeout(res, 50)); // bot picks up
    const before = c.getState();
    expect(before.busyBotIds.length).toBe(1);
    c.removeBot();
    const after = c.getState();
    expect(after.pendingVipCount + after.pendingNormalCount).toBe(1);
    expect(c.getCompleted().length).toBe(0);
  });

  test("bots idle when no pending orders", () => {
    const c = new BotController();
    c.addBot(1000);
    const s = c.getState();
    expect(s.busyBotIds.length).toBe(0);
  });
});
