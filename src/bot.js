'use strict';

const BotStatus = Object.freeze({ IDLE: 'IDLE', PROCESSING: 'PROCESSING' });

/**
 * A cooking bot. It holds at most one order at a time and owns the timer for
 * whatever it is cooking, so the order and the timer can never disagree.
 */
class Bot {
  #id;
  #order = null;
  #timer = null;
  #timers;
  #processingMs;

  constructor({ id, timers, processingMs }) {
    this.#id = id;
    this.#timers = timers;
    this.#processingMs = processingMs;
  }

  get id() {
    return this.#id;
  }

  /** Derived rather than stored, so it can never disagree with what the bot holds. */
  get status() {
    return this.#order === null ? BotStatus.IDLE : BotStatus.PROCESSING;
  }

  get order() {
    return this.#order;
  }

  /** Takes the order and cooks it, calling `onDone(order)` once it is ready. */
  startCooking(order, onDone) {
    this.#order = order;
    this.#timer = this.#timers.setTimeout(() => {
      const cooked = this.#order;
      this.#order = null;
      this.#timer = null;
      onDone(cooked);
    }, this.#processingMs);
  }

  /**
   * Cancels any cooking in progress and hands back the unfinished order, or
   * null if the bot was idle. Nothing is part-cooked: the order will need the
   * full time again.
   */
  stopCooking() {
    if (this.#timer !== null) {
      this.#timers.clearTimeout(this.#timer);
      this.#timer = null;
    }
    const unfinished = this.#order;
    this.#order = null;
    return unfinished;
  }
}

module.exports = { Bot, BotStatus };
