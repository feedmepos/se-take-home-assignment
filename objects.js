import { pause } from './util.js';

const ORDER_PROCESSING_TIME_MS = 10_000;


//--- ORDERS ---//

export class Order {
  /**
   * Incremented every time an order is created, so that each order.id is a unique non-zero.
   * @type {number}
   */
  static #lastId = 0;

  /** @type {number}  */ id = 0;
  /** @type {boolean} */ vip = false;

  /**
   * @param {boolean} [isVIP]
   */
  constructor(isVIP) {
    this.id = ++Order.#lastId;
    this.vip = !!isVIP;
  }
}

/**
 * Queues of orders.
 */
export const Orders = {
  /** @type {Order[]} */ pending: [],
  /** @type {Order[]} */ pendingVIP: [],
  /** @type {Order[]} */ completed: [],

  /**
   * @returns {Order}
   */
  add() {
    const order = new Order();
    Orders.pending.push(order);
    return order;
  },

  /**
   * @returns {Order}
   */
  addVIP() {
    const order = new Order(true);
    Orders.pendingVIP.push(order);
    return order;
  },
}


//--- BOTS ---//

export class Bot {
  /**
   * Bot's index in the `BotStaff.bots` array.
   * This must be updated when bot is pushed into the array.
   * @type {number}
   */
  id = -1;

  /**
   * Bot's currently 'owned' order.
   * If null, bot is considered idle.
   * @type {Order | null}
   */
  order = null;

  /**
   * Take oldest pending order, checking VIP queue first.
   * Then 'own' the order while processing.
   * Then release the order to the completed orders queue.
   */
  async pickupOrder() {
    const order =
      Orders.pendingVIP.shift()
      || Orders.pending.shift()
      || null;
    if (!order) {
      return;
    }
    this.order = order;
    await this.processOrder();
    if (!this.order) {
      return; // If bot no longer 'owns' the order at this point, don't proceed
    }
    Orders.completed.push(order);
    this.order = null;
    document.body.dispatchEvent(new CompleteOrderEvent(order, this));
  }

  /**
   * Spend time processing currently 'owned' order.
   * @returns {Promise<void>}
   */
  processOrder() {
    return pause(ORDER_PROCESSING_TIME_MS);
  }

  /**
   * If currently 'owning' an order, release it to the front of its original pending queue.
   * @returns {Order | null}
   */
  returnOrder() {
    if (!this.order) {
      return null;
    }
    const order = this.order;
    const originalQueue = order.vip ? Orders.pendingVIP : Orders.pending;
    originalQueue.unshift(order); // Reinsert to the front of the queue
    this.order = null;
    return order;
  }
}

export const BotStaff = {
  /**
   * @type {Bot[]}
   */
  bots: [],

  /**
   * @returns {Bot}
   */
  add() {
    const bot = new Bot();
    bot.id = this.bots.length;
    this.bots.push(bot);
    return bot;
  },

  /**
   * Remove newest bot, aborting and returning any order in progress.
   * Return removed bot object and aborted order if any.
   * @returns {[Bot, Order | null]}
   */
  remove() {
    const bot = this.bots.pop();
    const order = bot.returnOrder();
    return [bot, order];
    // Bot destroyed at this point
  },

  /**
   * Return first bot not processing any order.
   * @returns {Bot | null}
   */
  findIdle() {
    return this.bots.find(bot => !bot.order);
  },
}


//--- EVENTS ---//

class CompleteOrderEvent extends Event {
  /**
   * @param {Order} order
   * @param {Bot} bot
   */
  constructor(order, bot) {
    super('order:complete');
    this.order = order;
    this.bot = bot;
  }
}
