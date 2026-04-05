const { format } = require("../utils");

class Order {
  static nextId = 1;

  constructor(type) {
    this.id = Order.nextId++;
    this.type = type;
    this.status = "pending";
    this.createdAt = new Date();
    this.completedAt = null;
  }

  createMessage() {
    return format(`Order #${this.id} created (${this.type.toUpperCase()})`);
  }

  completeMessage() {
    this.status = "completed";
    this.completedAt = new Date();
    return format(`Order #${this.id} completed (${this.type.toUpperCase()})`);
  }
}

module.exports = { Order };
