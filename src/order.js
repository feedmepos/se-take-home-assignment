'use strict';

class Order {
  constructor(id, type) {
    this.id = id;
    this.type = type; // 'NORMAL' | 'VIP'
    this.status = 'PENDING';
    this.createdAt = new Date();
    this.pickedUpAt = null;
    this.completedAt = null;
  }

  toString() {
    if (this.type === 'VIP') {
      return `⭐ VIP Order #${this.id}`;
    }
    return `Normal Order #${this.id}`;
  }
}

module.exports = { Order };
