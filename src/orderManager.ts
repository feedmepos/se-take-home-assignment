import { Order, ORDER_TYPE } from './order.js';
import { Bot } from './bot.js';
import logger from './logger.js';

export class OrderManager {
  private _nextOrderId: number;
  private _nextBotId: number;
  private _pendingQueue: Order[];
  private _completedOrders: Order[];
  private _bots: Bot[];

  constructor() {
    this._nextOrderId = 1;
    this._nextBotId = 1;
    this._pendingQueue = [];
    this._completedOrders = [];
    this._bots = [];
  }

  // ---------------------------------------------------------------------------
  // Orders
  // ---------------------------------------------------------------------------

  /** Add a new Normal order. */
  addNormalOrder(): Order {
    const order = new Order(this._nextOrderId++, ORDER_TYPE.NORMAL);
    this._enqueue(order);
    logger.log(`Created ${order} - Status: ${order.status}`);
    this._dispatchIdleBots();
    return order;
  }

  /** Add a new VIP order (placed after existing VIPs, before all Normals). */
  addVIPOrder(): Order {
    const order = new Order(this._nextOrderId++, ORDER_TYPE.VIP);
    this._enqueue(order);
    logger.log(`Created ${order} - Status: ${order.status}`);
    this._dispatchIdleBots();
    return order;
  }

  /** Add a new VVIP order (placed after existing VVIPs, before all VIPs and Normals). */
  addVVIPOrder(): Order {
    const order = new Order(this._nextOrderId++, ORDER_TYPE.VVIP);
    this._enqueue(order);
    logger.log(`Created ${order} - Status: ${order.status}`);
    this._dispatchIdleBots();
    return order;
  }

  // ---------------------------------------------------------------------------
  // Bots
  // ---------------------------------------------------------------------------

  /** Create a new bot and immediately assign a pending order if available. */
  addBot(): Bot {
    const bot = new Bot(this._nextBotId++, (b, order) => this._onOrderComplete(b, order));
    this._bots.push(bot);
    logger.log(`Bot #${bot.id} created - Status: ACTIVE`);
    this._dispatchBot(bot);
    return bot;
  }

  /**
   * Destroy the newest bot. If it was processing an order, return that order
   * to its correct priority position in the pending queue.
   */
  removeBot(): Bot | null {
    if (this._bots.length === 0) {
      logger.log('No bots to remove');
      return null;
    }
    const bot = this._bots.pop()!;
    const returnedOrder = bot.cancel();

    if (returnedOrder) {
      this._enqueue(returnedOrder);
      logger.log(`Bot #${bot.id} destroyed - ${returnedOrder} returned to PENDING`);
    } else {
      logger.log(`Bot #${bot.id} destroyed while IDLE`);
    }
    return bot;
  }

  // ---------------------------------------------------------------------------
  // Status
  // ---------------------------------------------------------------------------

  getStatus(): { bots: number; pending: number; completed: number; activeBots: number } {
    return {
      bots: this._bots.length,
      pending: this._pendingQueue.length,
      completed: this._completedOrders.length,
      activeBots: this._bots.filter((b) => b.currentOrder !== null).length,
    };
  }

  getPendingQueue(): Order[] {
    return [...this._pendingQueue];
  }

  getCompletedOrders(): Order[] {
    return [...this._completedOrders];
  }

  getBots(): Bot[] {
    return [...this._bots];
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /**
   * Insert an order into the pending queue respecting priority:
   * VVIP orders go after the last existing VVIP order, before any VIP or Normal orders.
   * VIP orders go after the last existing VVIP or VIP order, before any Normal orders.
   * Normal orders go at the end.
   *
   * Resulting queue shape: [ ...VVIPs, ...VIPs, ...Normals ]
   */
  private _enqueue(order: Order): void {
    if (order.type === ORDER_TYPE.VVIP) {
      // Insert after the last VVIP entry (before any VIP or Normal)
      let insertAt = 0;
      for (let i = 0; i < this._pendingQueue.length; i++) {
        if (this._pendingQueue[i].type === ORDER_TYPE.VVIP) {
          insertAt = i + 1;
        }
      }
      this._pendingQueue.splice(insertAt, 0, order);
    } else if (order.type === ORDER_TYPE.VIP) {
      // Insert after the last VVIP or VIP entry (before any Normal)
      let insertAt = 0;
      for (let i = 0; i < this._pendingQueue.length; i++) {
        if (
          this._pendingQueue[i].type === ORDER_TYPE.VVIP ||
          this._pendingQueue[i].type === ORDER_TYPE.VIP
        ) {
          insertAt = i + 1;
        }
      }
      this._pendingQueue.splice(insertAt, 0, order);
    } else {
      this._pendingQueue.push(order);
    }
  }

  /** Dispatch a specific idle bot to the next pending order if available. */
  private _dispatchBot(bot: Bot): void {
    if (this._pendingQueue.length === 0) {
      logger.log(`Bot #${bot.id} is now IDLE - No pending orders`);
      return;
    }
    const order = this._pendingQueue.shift()!;
    bot.pickupOrder(order);
    logger.log(`Bot #${bot.id} picked up ${order} - Status: PROCESSING`);
  }

  /** Assign pending orders to all idle bots. */
  private _dispatchIdleBots(): void {
    for (const bot of this._bots) {
      if (bot.currentOrder === null && this._pendingQueue.length > 0) {
        const order = this._pendingQueue.shift()!;
        bot.pickupOrder(order);
        logger.log(`Bot #${bot.id} picked up ${order} - Status: PROCESSING`);
      }
    }
  }

  /** Called by a bot when it finishes processing an order. */
  private _onOrderComplete(bot: Bot, order: Order): void {
    this._completedOrders.push(order);
    logger.log(`Bot #${bot.id} completed ${order} - Status: COMPLETE (Processing time: 10s)`);
    this._dispatchBot(bot);
  }
}
