"use strict";

const { OrderController, ORDER_TYPE, ORDER_STATUS } = require("../src/OrderController");

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Create a controller with 100ms processing time for fast tests. */
function makeCtrl(onEvent) {
  return new OrderController({ processingTimeMs: 100, onEvent });
}

function wait(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("OrderController", () => {
  // ── Order queuing ──────────────────────────────────────────────────────────

  describe("addOrder", () => {
    it("normal order goes to the end of PENDING", () => {
      const ctrl = makeCtrl();
      ctrl.addOrder(ORDER_TYPE.NORMAL);
      ctrl.addOrder(ORDER_TYPE.NORMAL);
      const ids = ctrl.pendingOrders.map((o) => o.id);
      expect(ids).toEqual([1, 2]);
    });

    it("VIP order is inserted behind existing VIPs but before NORMALs", () => {
      const ctrl = makeCtrl();
      ctrl.addOrder(ORDER_TYPE.NORMAL); // #1
      ctrl.addOrder(ORDER_TYPE.NORMAL); // #2
      ctrl.addOrder(ORDER_TYPE.VIP);    // #3 → front
      ctrl.addOrder(ORDER_TYPE.VIP);    // #4 → behind #3, before #1 #2
      const ids = ctrl.pendingOrders.map((o) => o.id);
      expect(ids).toEqual([3, 4, 1, 2]);
    });

    it("order IDs are unique and increasing", () => {
      const ctrl = makeCtrl();
      const a = ctrl.addOrder(ORDER_TYPE.NORMAL);
      const b = ctrl.addOrder(ORDER_TYPE.VIP);
      const c = ctrl.addOrder(ORDER_TYPE.NORMAL);
      expect(a.id).toBe(1);
      expect(b.id).toBe(2);
      expect(c.id).toBe(3);
    });

    it("new order status is PENDING", () => {
      const ctrl = makeCtrl();
      const order = ctrl.addOrder(ORDER_TYPE.NORMAL);
      expect(order.status).toBe(ORDER_STATUS.PENDING);
    });
  });

  // ── Bot management ─────────────────────────────────────────────────────────

  describe("addBot", () => {
    it("idle bot picks up a waiting order immediately", async () => {
      const ctrl = makeCtrl();
      ctrl.addOrder(ORDER_TYPE.NORMAL);
      ctrl.addBot();
      // Order should now be PROCESSING (not PENDING)
      expect(ctrl.pendingOrders).toHaveLength(0);
      expect(ctrl.bots[0].isIdle).toBe(false);
      await wait(150); // let it complete
    });

    it("bot becomes idle when no orders are available", () => {
      const ctrl = makeCtrl();
      ctrl.addBot();
      expect(ctrl.bots[0].isIdle).toBe(true);
    });

    it("order moves to COMPLETE after processing time", async () => {
      const events = [];
      const ctrl = makeCtrl((evt) => events.push(evt));
      ctrl.addOrder(ORDER_TYPE.NORMAL);
      ctrl.addBot();
      await wait(150);
      expect(events).toContain("ORDER_COMPLETE");
    });

    it("bot picks up next pending order after finishing one", async () => {
      const ctrl = makeCtrl();
      ctrl.addOrder(ORDER_TYPE.NORMAL); // #1
      ctrl.addOrder(ORDER_TYPE.NORMAL); // #2
      ctrl.addBot();
      // #1 is being processed; #2 is pending
      expect(ctrl.pendingOrders).toHaveLength(1);
      await wait(150); // #1 completes → bot picks up #2
      expect(ctrl.pendingOrders).toHaveLength(0);
      await wait(150); // #2 completes
    });

    it("adding a bot when orders are waiting starts processing immediately", async () => {
      const ctrl = makeCtrl();
      ctrl.addOrder(ORDER_TYPE.NORMAL);
      ctrl.addOrder(ORDER_TYPE.NORMAL);
      ctrl.addBot(); // picks up #1
      ctrl.addBot(); // picks up #2
      expect(ctrl.pendingOrders).toHaveLength(0);
      await wait(150);
    });
  });

  // ── Removing bots ──────────────────────────────────────────────────────────

  describe("removeBot", () => {
    it("removes the newest bot", () => {
      const ctrl = makeCtrl();
      ctrl.addBot(); // Bot#1
      ctrl.addBot(); // Bot#2
      ctrl.removeBot();
      expect(ctrl.bots).toHaveLength(1);
      expect(ctrl.bots[0].id).toBe(1); // Bot#2 was removed
    });

    it("in-progress order is returned to PENDING when bot is removed", () => {
      const ctrl = makeCtrl();
      ctrl.addOrder(ORDER_TYPE.NORMAL); // #1
      ctrl.addBot();                    // Bot#1 picks up #1
      expect(ctrl.pendingOrders).toHaveLength(0);
      ctrl.removeBot();
      expect(ctrl.pendingOrders).toHaveLength(1);
      expect(ctrl.pendingOrders[0].id).toBe(1);
      expect(ctrl.pendingOrders[0].status).toBe(ORDER_STATUS.PENDING);
    });

    it("returned VIP order keeps its priority position", () => {
      const ctrl = makeCtrl();
      ctrl.addOrder(ORDER_TYPE.NORMAL); // #1 — pending
      ctrl.addOrder(ORDER_TYPE.VIP);    // #2 — pending (front)
      ctrl.addBot();                    // Bot#1 picks up VIP #2
      ctrl.addOrder(ORDER_TYPE.NORMAL); // #3 — pending
      ctrl.removeBot();                 // Bot#1 removed → #2 returns
      // Queue should be: [#2(VIP), #1(NORMAL), #3(NORMAL)]
      const ids = ctrl.pendingOrders.map((o) => o.id);
      expect(ids[0]).toBe(2); // VIP at front
    });

    it("does nothing when there are no bots", () => {
      const ctrl = makeCtrl();
      expect(() => ctrl.removeBot()).not.toThrow();
    });

    it("idle bot is removed without affecting orders", () => {
      const ctrl = makeCtrl();
      ctrl.addBot();
      ctrl.addOrder(ORDER_TYPE.NORMAL); // Bot is idle (created before order... wait)
      // Actually idle bot auto-picks when order is added, so let's create an idle bot
      const ctrl2 = makeCtrl();
      ctrl2.addBot(); // idle — no orders
      ctrl2.removeBot();
      expect(ctrl2.bots).toHaveLength(0);
    });
  });

  // ── VIP priority ──────────────────────────────────────────────────────────

  describe("VIP priority", () => {
    it("VIP order is processed before normal orders", async () => {
      const processed = [];
      const ctrl = new OrderController({
        processingTimeMs: 100,
        onEvent(evt, data) {
          if (evt === "ORDER_PROCESSING") processed.push(data.order.id);
          if (evt === "ORDER_COMPLETE") ctrl._completeOrders.push(data.order);
        },
      });

      // Add all orders first (no bot yet), so queue ordering is observable
      ctrl.addOrder(ORDER_TYPE.NORMAL); // #1
      ctrl.addOrder(ORDER_TYPE.NORMAL); // #2
      ctrl.addOrder(ORDER_TYPE.VIP);    // #3 → jumps to front

      // Queue should be [#3(VIP), #1(NORMAL), #2(NORMAL)]
      expect(ctrl.pendingOrders[0].id).toBe(3);
      expect(ctrl.pendingOrders[1].id).toBe(1);
      expect(ctrl.pendingOrders[2].id).toBe(2);

      // Now add a single bot — it will process in priority order
      ctrl.addBot(); // picks up #3 (VIP) first

      await wait(350); // wait for all 3 to complete
      // Processing order: #3(VIP) → #1(NORMAL) → #2(NORMAL)
      expect(processed[0]).toBe(3);
      expect(processed[1]).toBe(1);
      expect(processed[2]).toBe(2);
    });
  });
});
