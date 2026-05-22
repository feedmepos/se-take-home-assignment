/**
 * Bot Model
 * Represents a cooking bot that processes orders
 */
import { BOT_STATUS, PROCESSING_TIME_MS } from '../constants.js';

export class Bot {
  /**
   * Creates a new bot
   * @param {number} botId - Unique bot identifier
   */
  constructor(botId) {
    this.botId = botId;
    this.status = BOT_STATUS.IDLE; // BOT_STATUS.IDLE or BOT_STATUS.PROCESSING
    this.currentOrder = null;
    this.processingTimeout = null;
  }

  /**
   * Starts processing an order
   * @param {Order} order - The order to process
   * @param {Function} onComplete - Callback function when order is completed
   */
  startProcessing(order, onComplete) {
    if (this.status !== BOT_STATUS.IDLE) {
      throw new Error('Bot is already processing an order');
    }

    this.currentOrder = order;
    this.status = BOT_STATUS.PROCESSING;
    order.startProcessing();

    // Process order for configured processing time
    this.processingTimeout = setTimeout(() => {
      this.completeOrder(onComplete);
    }, PROCESSING_TIME_MS);
  }

  /**
   * Completes the current order and becomes idle
   * @param {Function} onComplete - Callback function when order is completed
   */
  completeOrder(onComplete) {
    // Clear timeout first to prevent multiple calls
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
      this.processingTimeout = null;
    }

    // Complete the order if it exists
    if (this.currentOrder) {
      this.currentOrder.complete();
      const completedOrder = this.currentOrder;
      this.currentOrder = null;
      this.status = BOT_STATUS.IDLE;

      if (onComplete) {
        onComplete(completedOrder);
      }
    } else {
      this.status = BOT_STATUS.IDLE;
    }
  }

  /**
   * Stops processing the current order and returns it to pending
   * Used when bot is destroyed while processing
   * @returns {Order|null} The order that was being processed, or null
   */
  stopProcessing() {
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
      this.processingTimeout = null;
    }

    if (this.currentOrder) {
      const order = this.currentOrder;
      order.returnToPending();
      this.currentOrder = null;
      this.status = BOT_STATUS.IDLE;
      return order;
    }

    return null;
  }

  /**
   * Checks if the bot is currently idle
   * @returns {boolean}
   */
  isIdle() {
    return this.status === BOT_STATUS.IDLE;
  }
}
