const { ORDER_TYPE } = require('../constants/statuses');

class QueueController {
  constructor() {
    this.pendingOrders = [];
  }

  /**
   * Inserts an order into the pending orders list while maintaining VIP priority.
   * VIP orders are inserted infront of all normal orders, and before other existing VIP orders.
   * Normal orders are inserted behind all VIP orders, and before other existing normal orders.
   * Edge Case: If an order process being stopped halfway, the order will be returned to its original position in the PENDING status.
   * @param {Order} order - The order to insert.
   */
  insert(order) {
    if (order.type === ORDER_TYPE.VIP) {
      let index = 0;

      while (
        index < this.pendingOrders.length &&
        this.pendingOrders[index].type === ORDER_TYPE.VIP &&
        this.pendingOrders[index].id < order.id
      ) {
        index += 1;
      }

      this.pendingOrders.splice(index, 0, order);
      return;
    }

    const firstNormalIndex = this.pendingOrders.findIndex(
      (pendingOrder) => pendingOrder.type === ORDER_TYPE.NORMAL
    );

    let index = firstNormalIndex === -1 ? this.pendingOrders.length : firstNormalIndex;

    while (
      index < this.pendingOrders.length &&
      this.pendingOrders[index].id < order.id
    ) {
      index += 1;
    }

    this.pendingOrders.splice(index, 0, order);
  }

  dequeue() {
    return this.pendingOrders.shift() || null;
  }

  hasPendingOrders() {
    return this.pendingOrders.length > 0;
  }

  getCount() {
    return this.pendingOrders.length;
  }

  getAll() {
    return this.pendingOrders;
  }
}

module.exports = QueueController;
