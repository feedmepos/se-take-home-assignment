/**
 * Order Controller
 * Main controller for managing orders and bots in the McDonald's system
 * Handles order prioritization (VIP > Normal), bot management, and order processing
 */
import { Order } from './models/order.js';
import { Bot } from './models/bot.js';
import { getCurrentTime } from './utils/timeFormatter.js';
import { ORDER_TYPES, STARTING_ORDER_NUMBER, STARTING_BOT_ID } from './constants.js';
import { OrderQueue } from './services/orderQueue.js';

export class OrderController {
  /**
   * Creates a new order controller
   * @param {Function} logger - Logging function that accepts formatted messages
   */
  constructor(logger = console.log) {
    this.logger = logger;
    this.orders = []; // All orders (pending, processing, complete)
    this.orderQueue = new OrderQueue(); // Priority queue for pending orders
    this.completedOrders = []; // Completed orders
    this.bots = []; // Active bots
    this.nextOrderNumber = STARTING_ORDER_NUMBER; // Starting order number
    this.nextBotId = STARTING_BOT_ID; // Starting bot ID
  }

  /**
   * Creates a new order and adds it to the pending queue
   * @param {string} type - Order type (ORDER_TYPES.NORMAL or ORDER_TYPES.VIP)
   * @returns {Order} The created order
   * @private
   */
  _createOrder(type) {
    const order = new Order(this.nextOrderNumber++, type);
    this.orders.push(order);
    this.orderQueue.enqueue(order);
    this.logger(`[${getCurrentTime()}] Created ${type} Order #${order.orderNumber} - Status: ${order.status}`);
    this._assignOrdersToIdleBots();
    return order;
  }

  /**
   * Creates a new normal order and adds it to the pending queue
   * @returns {Order} The created order
   */
  createNormalOrder() {
    return this._createOrder(ORDER_TYPES.NORMAL);
  }

  /**
   * Creates a new VIP order and adds it to the pending queue with priority
   * VIP orders are placed in front of all normal orders but behind existing VIP orders
   * @returns {Order} The created order
   */
  createVIPOrder() {
    return this._createOrder(ORDER_TYPES.VIP);
  }

  /**
   * Adds a new bot to the system
   * The bot will immediately start processing pending orders if available
   * @returns {Bot} The created bot
   */
  addBot() {
    const bot = new Bot(this.nextBotId++);
    this.bots.push(bot);
    this.logger(`[${getCurrentTime()}] Bot #${bot.botId} created - Status: ACTIVE`);
    this._assignOrdersToIdleBots();
    return bot;
  }

  /**
   * Removes the most recently added bot from the system
   * If the bot is processing an order, the order is returned to pending status
   * @returns {Bot|null} The removed bot, or null if no bots exist
   */
  removeBot() {
    if (this.bots.length === 0) {
      return null;
    }

    // Remove the last bot (most recently added)
    const bot = this.bots.pop();
    const order = bot.stopProcessing();

    if (order) {
      // Order was being processed, return it to pending queue
      // Re-insert it at the correct position based on priority
      this.orderQueue.enqueue(order);
      this.logger(`[${getCurrentTime()}] Bot #${bot.botId} destroyed while processing Order #${order.orderNumber}`);
    } else {
      this.logger(`[${getCurrentTime()}] Bot #${bot.botId} destroyed while IDLE`);
    }

    // Try to assign the returned order (if any) to another bot
    if (order) {
      this._assignOrdersToIdleBots();
    }

    return bot;
  }

  /**
   * Assigns pending orders to idle bots
   * VIP orders are prioritized over normal orders
   * This is called automatically when orders are created or bots are added
   * @private
   */
  _assignOrdersToIdleBots() {
    const idleBots = this.bots.filter(bot => bot.isIdle());

    if (idleBots.length === 0 || this.orderQueue.isEmpty()) {
      return;
    }

    // Assign orders to idle bots
    for (const bot of idleBots) {
      if (this.orderQueue.isEmpty()) {
        break; // No more orders to assign
      }

      const order = this.orderQueue.dequeue();
      bot.startProcessing(order, (completedOrder) => {
        this._onOrderCompleted(bot, completedOrder);
      });

      this.logger(`[${getCurrentTime()}] Bot #${bot.botId} picked up ${order.type} Order #${order.orderNumber} - Status: ${order.status}`);
    }
  }

  /**
   * Handles order completion callback
   * Moves order to completed status and tries to assign next order
   * @param {Bot} bot - The bot that completed the order
   * @param {Order} order - The completed order
   * @private
   */
  _onOrderCompleted(bot, order) {
    this.completedOrders.push(order);
    this.logger(`[${getCurrentTime()}] Bot #${bot.botId} completed ${order.type} Order #${order.orderNumber} - Status: ${order.status}`);
    this._assignOrdersToIdleBots();

    // Log if bot becomes idle (no pending orders available)
    if (this.orderQueue.isEmpty() && bot.isIdle()) {
      this.logger(`[${getCurrentTime()}] Bot #${bot.botId} is now IDLE - No pending orders`);
    }
  }

  /**
   * Gets the current system status
   * @returns {Object} Status object with counts and statistics
   */
  getStatus() {
    const vipOrders = this.orders.filter(order => order.isVIP()).length;
    const normalOrders = this.orders.filter(order => !order.isVIP()).length;
    const idleBots = this.bots.filter(bot => bot.isIdle()).length;
    const processingBots = this.bots.filter(bot => !bot.isIdle()).length;

    return {
      totalOrders: this.orders.length,
      vipOrders: vipOrders,
      normalOrders: normalOrders,
      completedOrders: this.completedOrders.length,
      pendingOrders: this.orderQueue.size(),
      activeBots: this.bots.length,
      idleBots: idleBots,
      processingBots: processingBots
    };
  }

  /**
   * Gets all pending orders
   * @returns {Order[]} Array of pending orders
   */
  getPendingOrders() {
    return this.orderQueue.getAll();
  }

  /**
   * Gets all completed orders
   * @returns {Order[]} Array of completed orders
   */
  getCompletedOrders() {
    return [...this.completedOrders];
  }

  /**
   * Gets all active bots
   * @returns {Bot[]} Array of active bots
   */
  getBots() {
    return [...this.bots];
  }
}
