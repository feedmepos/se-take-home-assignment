'use strict';

const { EventEmitter } = require('events');

/** Order categories. VIP orders are processed before NORMAL orders. */
const OrderType = Object.freeze({ NORMAL: 'NORMAL', VIP: 'VIP' });

/** Lifecycle of a single order. */
const OrderStatus = Object.freeze({
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETE: 'COMPLETE',
});

/** Lifecycle of a cooking bot. */
const BotStatus = Object.freeze({
  IDLE: 'IDLE',
  PROCESSING: 'PROCESSING',
});

/**
 * In-memory order controller for the McDonald's automated cooking bots.
 *
 * Responsibilities (see project README "Requirements"):
 *  - Keep a PENDING queue ordered by priority: all VIP orders ahead of all
 *    NORMAL orders, each group ordered by their (increasing) order number.
 *  - Each bot processes exactly one order at a time, taking `processMs` ms.
 *  - Adding a bot immediately starts processing a pending order, if any.
 *  - Removing a bot destroys the newest bot; an order it was processing is
 *    returned to the PENDING queue at its correct priority position.
 *
 * Timers are injectable so the engine can be driven by a fake clock in tests.
 */
class OrderController extends EventEmitter {
  /**
   * @param {object} [options]
   * @param {number} [options.processMs=10000] Milliseconds a bot needs per order.
   * @param {() => number} [options.now] Clock source (defaults to Date.now).
   * @param {typeof setTimeout} [options.setTimeoutFn] Injectable timer.
   * @param {typeof clearTimeout} [options.clearTimeoutFn] Injectable timer clear.
   */
  constructor(options = {}) {
    super();
    this.processMs = options.processMs ?? 10000;
    this._now = options.now ?? Date.now;
    this._setTimeout = options.setTimeoutFn ?? setTimeout;
    this._clearTimeout = options.clearTimeoutFn ?? clearTimeout;

    this._orderSeq = 0;
    this._botSeq = 0;

    /** @type {Array<object>} PENDING orders, always kept in priority order. */
    this.pending = [];
    /** @type {Array<object>} COMPLETE orders, in completion order. */
    this.complete = [];
    /** @type {Array<object>} Bots, oldest first (newest is the last element). */
    this.bots = [];
  }

  // --- Orders ---------------------------------------------------------------

  /**
   * Create a new order of the given type and queue it.
   * @param {string} type OrderType.NORMAL or OrderType.VIP
   * @returns {object} the created order
   */
  addOrder(type) {
    if (type !== OrderType.NORMAL && type !== OrderType.VIP) {
      throw new Error(`Unknown order type: ${type}`);
    }
    const order = {
      id: ++this._orderSeq,
      type,
      status: OrderStatus.PENDING,
      createdAt: this._now(),
      startedAt: null,
      completedAt: null,
    };
    this._enqueue(order);
    this.emit('order:new', order);
    this._assignWork();
    return order;
  }

  addNormalOrder() {
    return this.addOrder(OrderType.NORMAL);
  }

  addVipOrder() {
    return this.addOrder(OrderType.VIP);
  }

  /**
   * Insert an order into the PENDING queue and re-sort by priority.
   * Sorting by (VIP-before-NORMAL, then increasing id) guarantees that both
   * brand new orders and orders returned by a destroyed bot land in the
   * correct position automatically.
   */
  _enqueue(order) {
    order.status = OrderStatus.PENDING;
    this.pending.push(order);
    this.pending.sort(
      (a, b) => priorityRank(a) - priorityRank(b) || a.id - b.id
    );
  }

  // --- Bots -----------------------------------------------------------------

  /**
   * Create a new bot. It immediately starts processing a pending order if one
   * is available, otherwise it stays IDLE.
   * @returns {object} the created bot
   */
  addBot() {
    const bot = {
      id: ++this._botSeq,
      status: BotStatus.IDLE,
      order: null,
      _timer: null,
    };
    this.bots.push(bot);
    this.emit('bot:new', bot);
    this._assignWork();
    return bot;
  }

  /**
   * Destroy the newest bot. If it was processing an order, the order is
   * returned to the PENDING queue (keeping VIP/NORMAL priority) so another bot
   * can pick it up.
   * @returns {object|null} the removed bot, or null if there were no bots
   */
  removeBot() {
    const bot = this.bots.pop();
    if (!bot) return null;

    if (bot._timer) {
      this._clearTimeout(bot._timer);
      bot._timer = null;
    }

    const returnedOrder = bot.order;
    if (returnedOrder) {
      bot.order = null;
      this._enqueue(returnedOrder);
      this.emit('order:returned', returnedOrder, bot);
    }

    bot.status = BotStatus.IDLE;
    this.emit('bot:removed', bot);

    // A returned order may now be picked up by a remaining idle bot.
    this._assignWork();
    return bot;
  }

  // --- Scheduling -----------------------------------------------------------

  /** Hand pending orders to any idle bots. */
  _assignWork() {
    for (const bot of this.bots) {
      if (bot.status !== BotStatus.IDLE || this.pending.length === 0) continue;

      const order = this.pending.shift();
      bot.order = order;
      bot.status = BotStatus.PROCESSING;
      order.status = OrderStatus.PROCESSING;
      order.startedAt = this._now();
      this.emit('order:processing', order, bot);

      bot._timer = this._setTimeout(() => this._completeOrder(bot), this.processMs);
    }
  }

  /** Finish the order a bot is working on and let the bot pick up the next. */
  _completeOrder(bot) {
    const order = bot.order;
    if (!order) return;

    order.status = OrderStatus.COMPLETE;
    order.completedAt = this._now();
    this.complete.push(order);

    bot.order = null;
    bot._timer = null;
    bot.status = BotStatus.IDLE;
    this.emit('order:complete', order, bot);

    this._assignWork();
  }

  // --- Read models ----------------------------------------------------------

  /** A plain, serializable snapshot of the current state. */
  snapshot() {
    return {
      pending: this.pending.map(serializeOrder),
      complete: this.complete.map(serializeOrder),
      bots: this.bots.map(serializeBot),
    };
  }
}

/** VIP ranks before NORMAL. */
function priorityRank(order) {
  return order.type === OrderType.VIP ? 0 : 1;
}

function serializeOrder(order) {
  return {
    id: order.id,
    type: order.type,
    status: order.status,
    createdAt: order.createdAt,
    startedAt: order.startedAt,
    completedAt: order.completedAt,
  };
}

function serializeBot(bot) {
  return {
    id: bot.id,
    status: bot.status,
    orderId: bot.order ? bot.order.id : null,
  };
}

module.exports = {
  OrderController,
  OrderType,
  OrderStatus,
  BotStatus,
};
