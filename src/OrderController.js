/**
 * OrderController
 * Manages the pending/complete queues and bot pool.
 * All state lives in memory; no persistence.
 */

"use strict";

class OrderController {
  constructor(logger) {
    this._orderSeq = 0;
    this._botSeq = 0;
    this._pending = []; // ordered queue: VIP first, then Normal (FIFO within type)
    this._complete = [];
    this._bots = new Map(); // botId -> { id, orderId, timer }
    this._logger = logger;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  _nextOrderId() { return ++this._orderSeq; }
  _nextBotId()   { return ++this._botSeq; }

  _insertOrder(order) {
    if (order.type === "VIP") {
      // Place behind last VIP, ahead of first Normal
      const lastVipIdx = this._pending.reduce(
        (last, o, i) => (o.type === "VIP" ? i : last), -1
      );
      this._pending.splice(lastVipIdx + 1, 0, order);
    } else {
      this._pending.push(order);
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  addOrder(type) {
    const order = { id: this._nextOrderId(), type, status: "PENDING" };
    this._insertOrder(order);
    this._logger.info(`Order #${order.id} (${type}) added → PENDING`);
    this._assignIdleBots();
    return order;
  }

  addBot() {
    const bot = { id: this._nextBotId(), orderId: null, timer: null };
    this._bots.set(bot.id, bot);
    this._logger.info(`Bot #${bot.id} created`);
    this._tryAssign(bot);
    return bot.id;
  }

  removeBot() {
    if (this._bots.size === 0) {
      this._logger.warn("No bots to remove");
      return null;
    }
    // Remove the newest bot (highest id)
    const botId = Math.max(...this._bots.keys());
    const bot = this._bots.get(botId);

    clearTimeout(bot.timer);

    if (bot.orderId !== null) {
      // Return the order to pending in its correct position
      const order = { id: bot.orderId, type: bot.orderType, status: "PENDING" };
      this._insertOrder(order);
      this._logger.info(
        `Bot #${botId} removed — Order #${bot.orderId} returned to PENDING`
      );
    } else {
      this._logger.info(`Bot #${botId} removed (was idle)`);
    }

    this._bots.delete(botId);
    return botId;
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  _assignIdleBots() {
    for (const bot of this._bots.values()) {
      if (bot.orderId === null) this._tryAssign(bot);
    }
  }

  _tryAssign(bot) {
    if (this._pending.length === 0) return;

    const order = this._pending.shift();
    bot.orderId = order.id;
    bot.orderType = order.type;

    this._logger.info(
      `Bot #${bot.id} picked up Order #${order.id} (${order.type}) — processing…`
    );

    bot.timer = setTimeout(() => {
      this._complete.push({
        id: order.id,
        type: order.type,
        completedAt: this._logger.timestamp(),
      });
      this._logger.info(
        `Order #${order.id} (${order.type}) COMPLETE ✓`
      );

      bot.orderId = null;
      bot.orderType = null;
      bot.timer = null;

      // Immediately try to pick up the next pending order
      this._tryAssign(bot);
    }, this._processTime ?? 10_000);
  }

  // Allows tests to inject a shorter process time
  setProcessTime(ms) { this._processTime = ms; }

  // Snapshot for display / assertions
  snapshot() {
    return {
      pending: [...this._pending],
      complete: [...this._complete],
      bots: [...this._bots.values()].map(b => ({
        id: b.id,
        status: b.orderId ? "WORKING" : "IDLE",
        orderId: b.orderId ?? null,
      })),
    };
  }
}

module.exports = OrderController;
