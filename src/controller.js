'use strict';

const { Bot, BotStatus } = require('./bot');
const { Order } = require('./order');

/** Everything the controller reports through `onEvent`. */
const ControllerEvent = Object.freeze({
  ORDER_CREATED: 'ORDER_CREATED',
  ORDER_PICKED: 'ORDER_PICKED',
  ORDER_COMPLETED: 'ORDER_COMPLETED',
  ORDER_REQUEUED: 'ORDER_REQUEUED',
  BOT_ADDED: 'BOT_ADDED',
  BOT_REMOVED: 'BOT_REMOVED',
  BOT_REMOVE_NOOP: 'BOT_REMOVE_NOOP',
  BOT_IDLE: 'BOT_IDLE',
});

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
    const order = new Order(type);
    this.#queueFor(order).push(order);
    this.#emit(ControllerEvent.ORDER_CREATED, { order });
    this.#assignAnyIdleBot();
    return order;
  }

  addBot() {
    const bot = new Bot({ timers: this.#timers, processingMs: this.#processingMs });
    this.#bots.push(bot);
    this.#emit(ControllerEvent.BOT_ADDED, { bot });
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
      this.#emit(ControllerEvent.BOT_REMOVE_NOOP, {});
      return null;
    }

    const interrupted = bot.stopCooking();
    if (interrupted) {
      this.#requeue(interrupted);
    }

    this.#emit(ControllerEvent.BOT_REMOVED, { bot, interrupted });
    if (interrupted) {
      this.#assignAnyIdleBot();
    }
    return bot;
  }

  #queueFor(order) {
    return order.isVip ? this.#vipQueue : this.#normalQueue;
  }

  /**
   * Order ids are globally increasing, so sorting by id within the order's own
   * queue restores its original position without tracking indices.
   */
  #requeue(order) {
    order.markPending();
    const queue = this.#queueFor(order);
    const at = queue.findIndex((queued) => queued.id > order.id);
    if (at === -1) {
      queue.push(order);
    } else {
      queue.splice(at, 0, order);
    }
    this.#emit(ControllerEvent.ORDER_REQUEUED, { order });
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
      this.#emit(ControllerEvent.BOT_IDLE, { bot });
      return;
    }

    order.markProcessing();
    bot.startCooking(order, (cooked) => this.#complete(bot, cooked));
    this.#emit(ControllerEvent.ORDER_PICKED, { bot, order });
  }

  #complete(bot, order) {
    order.markCompleted();
    this.#completed.push(order);
    this.#emit(ControllerEvent.ORDER_COMPLETED, { bot, order });
    this.#assign(bot);
  }

  #emit(type, payload) {
    this.#onEvent({ type, ...payload });
  }
}

module.exports = { Controller, ControllerEvent, DEFAULT_PROCESSING_MS };
