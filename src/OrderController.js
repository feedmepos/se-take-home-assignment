"use strict";

/**
 * OrderController manages the order queue and cooking bots.
 *
 * Rules:
 * - VIP orders are inserted in front of all NORMAL orders, but behind existing VIP orders.
 * - Each bot processes one order at a time; takes `processingTimeMs` ms (default 10 000 ms).
 * - Removing the newest bot returns its in-progress order to PENDING.
 */

const ORDER_TYPE = Object.freeze({ NORMAL: "NORMAL", VIP: "VIP" });
const ORDER_STATUS = Object.freeze({ PENDING: "PENDING", PROCESSING: "PROCESSING", COMPLETE: "COMPLETE" });

class Order {
  constructor(id, type) {
    this.id = id;
    this.type = type;
    this.status = ORDER_STATUS.PENDING;
  }
}

class Bot {
  /**
   * @param {number} id
   * @param {function(Bot): void} onOrderComplete  called when current order finishes
   * @param {number} processingTimeMs
   */
  constructor(id, onOrderComplete, processingTimeMs = 10_000) {
    this.id = id;
    this.processingTimeMs = processingTimeMs;
    this.currentOrder = null;
    this._onOrderComplete = onOrderComplete;
    this._timer = null;
  }

  /** Assign an order to this bot and start the timer. */
  startProcessing(order) {
    order.status = ORDER_STATUS.PROCESSING;
    this.currentOrder = order;
    this._timer = setTimeout(() => {
      order.status = ORDER_STATUS.COMPLETE;
      const completedOrder = order;
      this.currentOrder = null;
      this._timer = null;
      this._onOrderComplete(this, completedOrder);
    }, this.processingTimeMs);
  }

  /** Destroy this bot. Returns the in-progress order (or null) to the caller. */
  destroy() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    const order = this.currentOrder;
    if (order) {
      order.status = ORDER_STATUS.PENDING;
      this.currentOrder = null;
    }
    return order;
  }

  get isIdle() {
    return this.currentOrder === null;
  }
}

class OrderController {
  /**
   * @param {{ processingTimeMs?: number, onEvent?: function(string, object): void }} options
   */
  constructor(options = {}) {
    this._processingTimeMs = options.processingTimeMs ?? 10_000;
    this._onEvent = options.onEvent ?? (() => { });

    this._nextOrderId = 1;
    this._nextBotId = 1;

    /** @type {Order[]} pending queue — VIPs at the front, normals at the back */
    this._pendingQueue = [];
    /** @type {Order[]} */
    this._completeOrders = [];
    /** @type {Bot[]} ordered by creation time (oldest first) */
    this._bots = [];
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  addOrder(type) {
    const order = new Order(this._nextOrderId++, type);

    if (type === ORDER_TYPE.VIP) {
      // Insert behind existing VIPs but in front of all NORMALs
      const insertAt = this._lastVipIndex() + 1;
      this._pendingQueue.splice(insertAt, 0, order);
    } else {
      this._pendingQueue.push(order);
    }

    this._onEvent("ORDER_ADDED", { order });
    this._dispatchIdleBots();
    return order;
  }

  addBot() {
    const bot = new Bot(this._nextBotId++, (completedBot, completedOrder) => {
      this._completeOrders.push(completedOrder);
      this._onEvent("ORDER_COMPLETE", { order: completedOrder });
      this._tryAssignOrder(completedBot);
    }, this._processingTimeMs);

    this._bots.push(bot);
    this._onEvent("BOT_ADDED", { bot });
    this._tryAssignOrder(bot);
    return bot;
  }

  removeBot() {
    if (this._bots.length === 0) return null;

    const bot = this._bots.pop();
    const returnedOrder = bot.destroy();

    if (returnedOrder) {
      // Find the correct position based on type AND original order ID
      const insertAt = this._pendingQueue.findIndex((o) => {
        if (returnedOrder.type === ORDER_TYPE.VIP && o.type === ORDER_TYPE.NORMAL) return true;
        if (returnedOrder.type === o.type && returnedOrder.id < o.id) return true;
        return false;
      });

      if (insertAt === -1) {
        this._pendingQueue.push(returnedOrder);
      } else {
        this._pendingQueue.splice(insertAt, 0, returnedOrder);
      }

      this._onEvent("ORDER_RETURNED", { order: returnedOrder });
    }

    this._onEvent("BOT_REMOVED", { bot });
    return bot;
  }

  // ─── Read-only snapshots ───────────────────────────────────────────────────

  get pendingOrders() {
    return [...this._pendingQueue];
  }

  get completeOrders() {
    return [...this._completeOrders];
  }

  get bots() {
    return [...this._bots];
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  _lastVipIndex() {
    let last = -1;
    for (let i = 0; i < this._pendingQueue.length; i++) {
      if (this._pendingQueue[i].type === ORDER_TYPE.VIP) last = i;
    }
    return last;
  }

  _dispatchIdleBots() {
    for (const bot of this._bots) {
      if (bot.isIdle) this._tryAssignOrder(bot);
    }
  }

  _tryAssignOrder(bot) {
    if (this._pendingQueue.length === 0) return;
    const order = this._pendingQueue.shift();
    this._onEvent("ORDER_PROCESSING", { bot, order });
    bot.startProcessing(order);
  }

  _lastCompleted() {
    return this._completeOrders[this._completeOrders.length - 1] ?? null;
  }
}

module.exports = { OrderController, ORDER_TYPE, ORDER_STATUS };
