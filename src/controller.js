'use strict';

const { Bot, BotStatus } = require('./bot');

const OrderType = Object.freeze({ NORMAL: 'NORMAL', VIP: 'VIP' });
const OrderStatus = Object.freeze({ PENDING: 'PENDING', PROCESSING: 'PROCESSING', COMPLETE: 'COMPLETE' });

const DEFAULT_PROCESSING_MS = 10_000;

/** Real timers. Tests inject a fake so the suite runs instantly. */
const systemTimers = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (handle) => clearTimeout(handle),
};

/**
 * McDonald's order controller.
 *
 * Transport-agnostic: it never prints. Callers observe progress through the
 * `onEvent` callback, which lets the same core drive the REPL, the scripted
 * demo, or an HTTP server.
 */
class Controller {
  #nextOrderId = 1;
  #vipQueue = [];
  #normalQueue = [];
  #completed = [];
  #bots = [];
  #processingMs;
  #timers;
  #onEvent;

  constructor({ processingMs = DEFAULT_PROCESSING_MS, timers = systemTimers, onEvent = () => {} } = {}) {
    this.#processingMs = processingMs;
    this.#timers = timers;
    this.#onEvent = onEvent;
  }

  /** Pending orders in the exact order bots will pick them up: VIP first. */
  get pendingOrders() {
    return [...this.#vipQueue, ...this.#normalQueue];
  }

  get completedOrders() {
    return [...this.#completed];
  }

  get bots() {
    return [...this.#bots];
  }

  get processingMs() {
    return this.#processingMs;
  }

  newOrder(type) {
    if (type !== OrderType.NORMAL && type !== OrderType.VIP) {
      throw new Error(`Unknown order type: ${type}`);
    }
    const order = { id: this.#nextOrderId++, type, status: OrderStatus.PENDING };
    this.#queueFor(type).push(order);
    this.#emit('ORDER_CREATED', { order });
    this.#assignAnyIdleBot();
    return order;
  }

  addBot() {
    const bot = new Bot({ timers: this.#timers, processingMs: this.#processingMs });
    this.#bots.push(bot);
    this.#emit('BOT_ADDED', { bot });
    this.#assign(bot);
    return bot;
  }

  /**
   * Destroys the newest bot. Any order it was cooking goes back to PENDING at
   * its original position and will restart the full cooking time when picked
   * up again.
   */
  removeBot() {
    const bot = this.#bots.pop();
    if (!bot) {
      this.#emit('BOT_REMOVE_NOOP', {});
      return null;
    }

    const interrupted = bot.stopCooking();
    if (interrupted) {
      this.#requeue(interrupted);
    }

    this.#emit('BOT_REMOVED', { bot, interrupted });
    if (interrupted) {
      this.#assignAnyIdleBot();
    }
    return bot;
  }

  #queueFor(type) {
    return type === OrderType.VIP ? this.#vipQueue : this.#normalQueue;
  }

  /**
   * Order ids are globally increasing, so sorting by id within the order's own
   * queue restores its original position without tracking indices.
   */
  #requeue(order) {
    order.status = OrderStatus.PENDING;
    const queue = this.#queueFor(order.type);
    const at = queue.findIndex((queued) => queued.id > order.id);
    if (at === -1) {
      queue.push(order);
    } else {
      queue.splice(at, 0, order);
    }
    this.#emit('ORDER_REQUEUED', { order });
  }

  #assignAnyIdleBot() {
    const idle = this.#bots.find((bot) => bot.status === BotStatus.IDLE);
    if (idle) {
      this.#assign(idle);
    }
  }

  #assign(bot) {
    if (bot.status === BotStatus.PROCESSING) {
      return;
    }

    const order = this.#vipQueue.shift() ?? this.#normalQueue.shift();
    if (!order) {
      this.#emit('BOT_IDLE', { bot });
      return;
    }

    order.status = OrderStatus.PROCESSING;
    bot.startCooking(order, (cooked) => this.#complete(bot, cooked));
    this.#emit('ORDER_PICKED', { bot, order });
  }

  #complete(bot, order) {
    order.status = OrderStatus.COMPLETE;
    this.#completed.push(order);
    this.#emit('ORDER_COMPLETED', { bot, order });
    this.#assign(bot);
  }

  #emit(type, payload) {
    this.#onEvent({ type, ...payload });
  }
}

module.exports = { Controller, OrderType, OrderStatus, DEFAULT_PROCESSING_MS };
