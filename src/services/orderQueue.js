/**
 * Order Queue Service
 * Manages the priority queue of pending orders
 * Handles VIP order prioritization and queue operations
 */

export class OrderQueue {
  /**
   * Creates a new order queue
   */
  constructor() {
    this.orders = []; // Queue of pending orders (prioritized)
    this.vipOrderCount = 0; // Cache: number of VIP orders in queue (for O(1) insertion)
  }

  /**
   * Inserts an order into the queue at the correct priority position
   * VIP orders are placed after all existing VIP orders, but before normal orders
   * Normal orders are placed at the end
   * 
   * Time Complexity: 
   *   - VIP insertion: O(1) to find position (using cached count), then O(n) for splice
   *   - Normal insertion: O(1) for push
   *   - Overall: O(n) worst case due to array.splice() element shifting
   * Space Complexity: O(1)
   * 
   * @param {Order} order - The order to insert
   */
  enqueue(order) {
    if (order.isVIP()) {
      // Use cached VIP count for O(1) insertion point lookup
      const insertIndex = this.vipOrderCount;
      this.orders.splice(insertIndex, 0, order);
      this.vipOrderCount++; // Update cache
    } else {
      // Normal orders go at the end - O(1) operation
      this.orders.push(order);
    }
  }

  /**
   * Removes and returns the next order from the queue (FIFO with priority)
   * @returns {Order|null} The next order, or null if queue is empty
   */
  dequeue() {
    if (this.orders.length === 0) {
      return null;
    }

    const order = this.orders.shift();
    
    // Maintain VIP count cache when dequeuing
    if (order && order.isVIP()) {
      this.vipOrderCount--;
    }

    return order;
  }

  /**
   * Gets the number of orders in the queue
   * @returns {number} Queue length
   */
  size() {
    return this.orders.length;
  }

  /**
   * Checks if the queue is empty
   * @returns {boolean} True if queue is empty
   */
  isEmpty() {
    return this.orders.length === 0;
  }

  /**
   * Gets all orders in the queue (as a copy)
   * @returns {Order[]} Array of all orders in the queue
   */
  getAll() {
    return [...this.orders];
  }

  /**
   * Clears the queue
   */
  clear() {
    this.orders = [];
    this.vipOrderCount = 0;
  }
}
