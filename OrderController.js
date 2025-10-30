/**
 * McDonald's Order Controller
 * Manages orders and cooking bots for automated order processing
 */

export class OrderController {
  constructor() {
    this.orders = [];
    this.bots = [];
    this.completedOrders = [];
    this.orderCounter = 1000;
    this.botCounter = 0;
  }

  /**
   * Create a new order
   * @param {string} type - Order type: 'NORMAL' or 'VIP'
   * @returns {object} Created order
   */
  createOrder(type = 'NORMAL') {
    this.orderCounter++;
    const order = {
      id: this.orderCounter,
      type: type.toUpperCase(),
      status: 'PENDING',
      createdAt: new Date(),
    };

    // VIP orders go to the front, but behind other VIP orders
    if (type.toUpperCase() === 'VIP') {
      const lastVipIndex = this.orders.findLastIndex(o => o.type === 'VIP');
      this.orders.splice(lastVipIndex + 1, 0, order);
    } else {
      this.orders.push(order);
    }

    return order;
  }

  /**
   * Add a new bot
   * @returns {object} Created bot
   */
  addBot() {
    this.botCounter++;
    const bot = {
      id: this.botCounter,
      status: 'IDLE',
      currentOrder: null,
      processingTimer: null,
    };

    this.bots.push(bot);
    this.assignOrderToBot(bot);

    return bot;
  }

  /**
   * Remove a bot (removes the newest bot)
   * @returns {object|null} Removed bot or null if no bots
   */
  removeBot() {
    if (this.bots.length === 0) return null;

    const bot = this.bots[this.bots.length - 1];

    // If bot is processing an order, return it to pending
    if (bot.status === 'PROCESSING' && bot.currentOrder) {
      if (bot.processingTimer) {
        clearTimeout(bot.processingTimer);
      }
      
      const order = bot.currentOrder;
      order.status = 'PENDING';
      this.orders.unshift(order); // Put at front of queue
    }

    this.bots.pop();
    return bot;
  }

  /**
   * Assign a pending order to an idle bot
   * @param {object} bot - The bot to assign work to
   */
  assignOrderToBot(bot) {
    if (this.orders.length === 0) {
      bot.status = 'IDLE';
      return;
    }

    const order = this.orders.shift();
    bot.currentOrder = order;
    bot.status = 'PROCESSING';
    order.status = 'PROCESSING';

    // Simulate 10-second processing time
    bot.processingTimer = setTimeout(() => {
      this.completeOrder(bot, order);
    }, 10000);
  }

  /**
   * Complete an order
   * @param {object} bot - Bot that completed the order
   * @param {object} order - Order that was completed
   */
  completeOrder(bot, order) {
    order.status = 'COMPLETE';
    order.completedAt = new Date();
    this.completedOrders.push(order);

    bot.currentOrder = null;
    bot.processingTimer = null;

    // Try to assign next order
    this.assignOrderToBot(bot);
  }

  /**
   * Get all pending orders
   * @returns {array} Array of pending orders
   */
  getPendingOrders() {
    return this.orders;
  }

  /**
   * Get all completed orders
   * @returns {array} Array of completed orders
   */
  getCompletedOrders() {
    return this.completedOrders;
  }

  /**
   * Get all bots
   * @returns {array} Array of bots
   */
  getBots() {
    return this.bots;
  }

  /**
   * Get system status
   * @returns {object} Current system status
   */
  getStatus() {
    return {
      totalBots: this.bots.length,
      activeBots: this.bots.filter(b => b.status === 'PROCESSING').length,
      idleBots: this.bots.filter(b => b.status === 'IDLE').length,
      pendingOrders: this.orders.length,
      completedOrders: this.completedOrders.length,
    };
  }
}
