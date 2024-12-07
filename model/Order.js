/**
 * Represents an order.
 */
class Order {
    /**
     * Creates an order.
     * @param {string} id - The ID of the order.
     * @param {string} type - The type of the order (e.g., "VIP" or "Normal").
     */
    constructor(id, type) {
      this.id = id;
      this.type = type;
    }
  }
  
  module.exports = Order;