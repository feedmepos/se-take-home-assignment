'use strict';

const { Order, OrderType, OrderStatus } = require('./order');
const { Bot, BotStatus } = require('./bot');
const { formatTime } = require('./format');

/**
 * In-memory order controller for the McDonald's cooking-bot prototype.
 *
 * Timing (setTimeout/clearTimeout), the clock (now) and the 10s processing
 * duration are all injectable so the same logic can run with real timers in
 * the CLI/scenario and with a fake scheduler in unit tests.
 */
class OrderController {
  constructor({
    processingMs = 10000,
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout,
    now = () => new Date(),
    onLog = null,
  } = {}) {
    this.processingMs = processingMs;
    this.setTimeoutFn = setTimeoutFn;
    this.clearTimeoutFn = clearTimeoutFn;
    this.now = now;
    this.onLog = onLog;

    this.pending = []; // priority-ordered queue
    this.complete = [];
    this.bots = [];
    this.nextOrderId = 1;
    this.nextBotId = 1;
    this.logs = [];
  }

  log(message) {
    const line = `[${formatTime(this.now())}] ${message}`;
    this.logs.push(line);
    if (this.onLog) this.onLog(line);
    return line;
  }

  // --- Orders -------------------------------------------------------------

  newNormalOrder() {
    return this._addOrder(OrderType.NORMAL);
  }

  newVipOrder() {
    return this._addOrder(OrderType.VIP);
  }

  _addOrder(type) {
    const order = new Order(this.nextOrderId++, type);
    this._enqueue(order);
    this.log(`Created ${type} Order #${order.id} -> PENDING`);
    this._dispatch();
    return order;
  }

  /**
   * Insert an order into the pending queue keeping priority:
   *   VIP before NORMAL; within the same type, lower (older) id first.
   * Used for both brand-new orders and orders returned by a destroyed bot, so
   * a preempted order always lands back in its correct position.
   */
  _enqueue(order) {
    order.status = OrderStatus.PENDING;
    const index = this.pending.findIndex((existing) => this._comesAfter(existing, order));
    if (index === -1) this.pending.push(order);
    else this.pending.splice(index, 0, order);
  }

  /** True if `existing` should be queued behind `incoming`. */
  _comesAfter(existing, incoming) {
    if (existing.isVip !== incoming.isVip) return incoming.isVip;
    return existing.id > incoming.id;
  }

  // --- Bots ---------------------------------------------------------------

  addBot() {
    const bot = new Bot(this.nextBotId++);
    this.bots.push(bot);
    this.log(`Bot #${bot.id} created -> IDLE`);
    this._dispatch();
    return bot;
  }

  /**
   * Destroy the newest bot. If it was processing, cancel the work and return
   * the order to its original position in the pending queue.
   */
  removeBot() {
    const bot = this.bots.pop();
    if (!bot) {
      this.log('No bot to remove');
      return null;
    }
    if (bot.status === BotStatus.PROCESSING && bot.currentOrder) {
      this.clearTimeoutFn(bot.timer);
      const order = bot.currentOrder;
      this._enqueue(order);
      this.log(`Bot #${bot.id} destroyed -> returned ${order.type} Order #${order.id} to PENDING`);
    } else {
      this.log(`Bot #${bot.id} destroyed (was IDLE)`);
    }
    bot.currentOrder = null;
    bot.timer = null;
    this._dispatch();
    return bot;
  }

  // --- Processing ---------------------------------------------------------

  /** Assign pending orders to any idle bots. */
  _dispatch() {
    for (const bot of this.bots) {
      if (this.pending.length === 0) break;
      if (bot.status === BotStatus.IDLE) this._assign(bot);
    }
  }

  _assign(bot) {
    const order = this.pending.shift();
    bot.currentOrder = order;
    bot.status = BotStatus.PROCESSING;
    order.status = OrderStatus.PROCESSING;
    this.log(`Bot #${bot.id} picked up ${order.type} Order #${order.id} -> PROCESSING`);
    bot.timer = this.setTimeoutFn(() => this._completeOrder(bot), this.processingMs);
  }

  _completeOrder(bot) {
    const order = bot.currentOrder;
    order.status = OrderStatus.COMPLETE;
    this.complete.push(order);
    bot.currentOrder = null;
    bot.timer = null;
    bot.status = BotStatus.IDLE;
    this.log(`Bot #${bot.id} completed ${order.type} Order #${order.id} -> COMPLETE`);

    if (this.pending.length > 0) this._assign(bot);
    else this.log(`Bot #${bot.id} is now IDLE`);
  }

  // --- Inspection ---------------------------------------------------------

  status() {
    return {
      pending: this.pending.map((o) => ({ id: o.id, type: o.type })),
      complete: this.complete.map((o) => ({ id: o.id, type: o.type })),
      bots: this.bots.map((b) => ({
        id: b.id,
        status: b.status,
        order: b.currentOrder ? b.currentOrder.id : null,
      })),
    };
  }
}

module.exports = { OrderController, OrderType, OrderStatus, BotStatus };
