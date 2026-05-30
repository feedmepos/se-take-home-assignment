const { ORDER_STATUS } = require('../constants/statuses');

class Order {
  constructor(id, type) {
    this.id = id;
    this.type = type;
    this.status = ORDER_STATUS.PENDING;
  }
}

module.exports = Order;
