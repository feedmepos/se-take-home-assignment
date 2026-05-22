/**
 * Order Model
 * Represents a customer order in the McDonald's order management system
 */
import { ORDER_TYPES, ORDER_STATUS } from '../constants.js';

export class Order {
  /**
   * Creates a new order
   * @param {number} orderNumber - Unique order number
   * @param {string} type - Order type: ORDER_TYPES.NORMAL or ORDER_TYPES.VIP
   */
  constructor(orderNumber, type) {
    this.orderNumber = orderNumber;
    this.type = type; // ORDER_TYPES.NORMAL or ORDER_TYPES.VIP
    this.status = ORDER_STATUS.PENDING; // ORDER_STATUS.PENDING, PROCESSING, or COMPLETE
    this.createdAt = new Date();
  }

  /**
   * Marks the order as being processed
   */
  startProcessing() {
    this.status = ORDER_STATUS.PROCESSING;
  }

  /**
   * Marks the order as completed
   */
  complete() {
    this.status = ORDER_STATUS.COMPLETE;
  }

  /**
   * Returns the order to pending status (e.g., when bot is destroyed)
   */
  returnToPending() {
    this.status = ORDER_STATUS.PENDING;
  }

  /**
   * Checks if this order is a VIP order
   * @returns {boolean}
   */
  isVIP() {
    return this.type === ORDER_TYPES.VIP;
  }
}
