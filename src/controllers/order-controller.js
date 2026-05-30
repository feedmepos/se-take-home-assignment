const Order = require('../models/order');
const QueueController = require('./queue-controller');
const BotController = require('./bot-controller');
const { ORDER_STATUS, BOT_STATUS } = require('../constants/statuses');
const {
  formatOrderCreated,
  formatBotCreated,
  formatOrderPickedUp,
  formatOrderCompleted,
  formatBotIdle,
  formatBotRemovedWhileProcessing,
  formatBotRemoved,
} = require('../utils/log-formatter');

class OrderController {
  constructor(options = {}) {
    this.queueController = new QueueController();
    this.botController = new BotController();
    this.completedOrders = [];
    this.nextOrderId = 1001;
    this.processingTime = options.processingTime ?? 10000;
    this.onLog = options.onLog || (() => {});
  }

  get pendingOrders() {
    return this.queueController.getAll();
  }

  get bots() {
    return this.botController.getAll();
  }

  /**
   * Adds a new order to the system with PENDING status. 
   * @param {string} type - The type of order ('Normal' or 'VIP').
   * @returns {Order} The created order.
   */
  addOrder(type) {
    const order = new Order(this.nextOrderId++, type);
    this.queueController.insert(order);
    this.onLog(formatOrderCreated(order));
    this._assignOrderToIdleBot();
    return order;
  }

   /**
   * Adds a new bot to the system with ACTIVE status.
   * @returns {Bot} The created bot.
   */
  addBot() {
    const bot = this.botController.addBot();
    const createdBotStatus = this.queueController.hasPendingOrders() ? BOT_STATUS.ACTIVE : bot.status;
    this.onLog(formatBotCreated(bot, createdBotStatus));
    this._processNext(bot);
    return bot;
  }

  /**
   * Removes the newest bot from the system.
   * Edge Case: If the bot is processing an order, the order will be returned to its original position in the PENDING status.
   * @returns {Bot|null} The removed bot, or null if no bots exist.
   */
  removeBot() {
    const bot = this.botController.removeLatestBot();

    if (!bot) {
      this.onLog('No bots to remove');
      return null;
    }

    if (bot.timer) {
      clearTimeout(bot.timer);
      bot.timer = null;
    }

    if (bot.currentOrder) {
      const order = bot.currentOrder;
      order.status = ORDER_STATUS.PENDING;
      bot.currentOrder = null;
      this.queueController.insert(order);
      this.onLog(formatBotRemovedWhileProcessing(bot, order));
      this._assignOrderToIdleBot();
    } else {
      this.onLog(formatBotRemoved(bot));
    }

    return bot;
  }

  /**
   * Processes the next available order for a bot.
   * @private
   * @param {Bot} bot - The bot to process the next order for.
   */
  _processNext(bot) {
    if (!this.queueController.hasPendingOrders()) {
      this.onLog(formatBotIdle(bot));
      return;
    }

    const order = this.queueController.dequeue();
    order.status = ORDER_STATUS.PROCESSING;
    bot.currentOrder = order;

    this.onLog(formatOrderPickedUp(bot, order));

    bot.timer = setTimeout(() => {
      if (!this.botController.includes(bot)) {
        return;
      }

      order.status = ORDER_STATUS.COMPLETE;
      bot.currentOrder = null;
      bot.timer = null;
      this.completedOrders.push(order);

      this.onLog(formatOrderCompleted(bot, order, this.processingTime));

      this._processNext(bot);
    }, this.processingTime);
  }

  /**
   * Assigns the next available order to an idle bot.
   * @private
   */
  _assignOrderToIdleBot() {
    const idleBot = this.botController.findIdleBot();

    if (idleBot && this.queueController.hasPendingOrders()) {
      this._processNext(idleBot);
    }
  }

  /**
   * Returns the current status of the system.
   * @returns {Object} The current status of the system.
   */
  getStatus() {
    return {
      pendingOrders: this.pendingOrders.map((order) => ({
        id: order.id,
        type: order.type,
        status: order.status,
      })),
      completedOrders: this.completedOrders.map((order) => ({
        id: order.id,
        type: order.type,
        status: order.status,
      })),
      bots: this.bots.map((bot) => ({
        id: bot.id,
        status: bot.status,
        currentOrder: bot.currentOrder ? bot.currentOrder.id : null,
      })),
      totalBots: this.botController.getCount(),
      totalPending: this.queueController.getCount(),
      totalCompleted: this.completedOrders.length,
    };
  }
}

module.exports = OrderController;
