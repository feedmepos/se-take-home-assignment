// Core order-controller state machine.
//
// Design notes:
// - PENDING orders are always kept sorted by (type rank, order number),
//   so VIP-before-Normal + FIFO-within-type is an invariant of the list.
//   This makes requirement #2 (VIP placement) and requirement #6 (returning
//   an interrupted order to its original position) fall out automatically.
// - Time is injected (scheduler + clock) so the logic is deterministic and
//   testable: real timers drive the interactive CLI, a virtual clock drives
//   the simulation and unit tests.

import {
  PROCESS_MS,
  OrderType,
  TYPE_RANK,
  OrderStatus,
  BotStatus,
} from './constants.js';

// Default scheduler backed by real wall-clock timers (used by the CLI).
const realScheduler = {
  schedule: (ms, cb) => setTimeout(cb, ms),
  cancel: (id) => clearTimeout(id),
};

export class OrderController {
  /**
   * @param {object}   [options]
   * @param {object}   [options.scheduler] - { schedule(ms, cb) -> id, cancel(id) }
   * @param {function} [options.now]        - returns current time in ms
   * @param {function} [options.onEvent]    - (message, timestampMs) => void
   */
  constructor({ scheduler = realScheduler, now = Date.now, onEvent } = {}) {
    this.scheduler = scheduler;
    this.now = now;
    this.onEvent = onEvent ?? (() => {});

    this.pending = [];    // sorted queue of PENDING orders
    this.completed = [];  // COMPLETE orders, in completion order
    this.bots = [];       // active bots, oldest first (newest at the end)

    this.nextOrderNumber = 1001; // unique, increasing
    this.nextBotId = 1;          // unique, increasing
  }

  // --- Event logging -------------------------------------------------------

  #emit(message) {
    this.onEvent(message, this.now());
  }

  // --- Orders --------------------------------------------------------------

  newNormalOrder() {
    return this.#addOrder(OrderType.NORMAL);
  }

  newVipOrder() {
    return this.#addOrder(OrderType.VIP);
  }

  #addOrder(type) {
    const order = {
      number: this.nextOrderNumber++,
      type,
      status: OrderStatus.PENDING,
    };
    this.#enqueue(order);
    this.#emit(`Created ${type} Order #${order.number} - Status: PENDING`);
    this.#assignIdleBots();
    return order;
  }

  // Insert into PENDING keeping the (type rank, order number) ordering.
  #enqueue(order) {
    order.status = OrderStatus.PENDING;
    const rank = TYPE_RANK[order.type];
    let i = this.pending.length;
    while (
      i > 0 &&
      (TYPE_RANK[this.pending[i - 1].type] > rank ||
        (TYPE_RANK[this.pending[i - 1].type] === rank &&
          this.pending[i - 1].number > order.number))
    ) {
      i--;
    }
    this.pending.splice(i, 0, order);
  }

  // --- Bots ----------------------------------------------------------------

  addBot() {
    const bot = {
      id: this.nextBotId++,
      status: BotStatus.IDLE,
      order: null,
      timerId: null,
    };
    this.bots.push(bot);
    this.#emit(`Bot #${bot.id} created - Status: IDLE`);
    this.#assignIdleBots();
    return bot;
  }

  // Requirement #6: remove the newest bot. If it was processing, cancel the
  // work and return the order to its original position in PENDING.
  removeBot() {
    const bot = this.bots.pop();
    if (!bot) return null;

    if (bot.status === BotStatus.PROCESSING && bot.order) {
      this.scheduler.cancel(bot.timerId);
      const order = bot.order;
      bot.order = null;
      bot.timerId = null;
      this.#enqueue(order); // drops back into its correct slot
      this.#emit(
        `Bot #${bot.id} destroyed while processing - ` +
          `${order.type} Order #${order.number} returned to PENDING`,
      );
      // A remaining idle bot may now pick up the returned order.
      this.#assignIdleBots();
    } else {
      this.#emit(`Bot #${bot.id} destroyed while IDLE`);
    }
    return bot;
  }

  // --- Scheduling ----------------------------------------------------------

  // Give pending orders to any idle bots (front of queue first).
  #assignIdleBots() {
    for (const bot of this.bots) {
      if (bot.status === BotStatus.IDLE && this.pending.length > 0) {
        this.#startProcessing(bot);
      }
    }
  }

  #startProcessing(bot) {
    const order = this.pending.shift();
    order.status = OrderStatus.PROCESSING;
    bot.order = order;
    bot.status = BotStatus.PROCESSING;
    this.#emit(
      `Bot #${bot.id} picked up ${order.type} Order #${order.number} - ` +
        `Status: PROCESSING`,
    );
    bot.timerId = this.scheduler.schedule(PROCESS_MS, () =>
      this.#completeOrder(bot),
    );
  }

  #completeOrder(bot) {
    const order = bot.order;
    order.status = OrderStatus.COMPLETE;
    this.completed.push(order);
    bot.order = null;
    bot.timerId = null;
    bot.status = BotStatus.IDLE;
    this.#emit(
      `Bot #${bot.id} completed ${order.type} Order #${order.number} - ` +
        `Status: COMPLETE (Processing time: ${PROCESS_MS / 1000}s)`,
    );

    if (this.pending.length > 0) {
      this.#startProcessing(bot);
    } else {
      this.#emit(`Bot #${bot.id} is now IDLE - No pending orders`);
    }
  }

  // --- Snapshot (for status display) --------------------------------------

  snapshot() {
    return {
      pending: this.pending.map((o) => ({ ...o })),
      completed: this.completed.map((o) => ({ ...o })),
      bots: this.bots.map((b) => ({
        id: b.id,
        status: b.status,
        order: b.order ? { ...b.order } : null,
      })),
    };
  }
}
