/**
 * Represents a bot.
 */
class Bot {
    /**
     * Creates a bot.
     * @param {number} id - The ID of the bot.
     */
    constructor(id) {
      this.id = `Bot-${id}`;
      this.isIdle = true;
      this.currentOrder = null;
      this.timeoutId = null;
    }
  
    /**
     * Processes an order.
     * @param {Order} order - The order to process.
     * @param {Function} onComplete - Callback to execute when processing is complete.
     * @param {number} processingTime - Time in milliseconds to process the order.
     */
    processOrder(order, onComplete, processingTime) {
      this.isIdle = false;
      this.currentOrder = order;
      console.log(`${this.id} is processing ${order.id} (${order.type}).`);
  
      this.timeoutId = setTimeout(() => {
        onComplete(this, order);
      }, processingTime);
    }
  
    /**
     * Resets the bot to an idle state.
     */
    reset() {
      this.isIdle = true;
      this.currentOrder = null;
      clearTimeout(this.timeoutId);
    }
  }
  
  module.exports = Bot;
  