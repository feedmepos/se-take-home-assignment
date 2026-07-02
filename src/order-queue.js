'use strict';

class OrderQueue {
  constructor() {
    this.orders = [];
  }

  enqueue(order) {
    if (order.type === 'VIP') {
      // Insert after last VIP, before first Normal
      let i = 0;
      while (i < this.orders.length && this.orders[i].type === 'VIP') {
        i++;
      }
      this.orders.splice(i, 0, order);
    } else {
      // Normal: append to end
      this.orders.push(order);
    }
  }

  dequeue() {
    if (this.orders.length === 0) {
      return null;
    }
    return this.orders.shift();
  }

  size() {
    return this.orders.length;
  }

  isEmpty() {
    return this.orders.length === 0;
  }

  snapshot() {
    if (this.orders.length === 0) {
      return '(empty)';
    }
    return this.orders.map(o => {
      return o.type === 'VIP' ? `⭐#${o.id}` : `#${o.id}`;
    }).join(' → ');
  }

  toArray() {
    return [...this.orders];
  }
}

module.exports = { OrderQueue };
