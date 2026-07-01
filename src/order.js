'use strict';

const OrderType = Object.freeze({ VIP: 'VIP', NORMAL: 'NORMAL' });

const OrderStatus = Object.freeze({
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETE: 'COMPLETE',
});

class Order {
  constructor(id, type) {
    this.id = id;
    this.type = type;
    this.status = OrderStatus.PENDING;
  }

  get isVip() {
    return this.type === OrderType.VIP;
  }
}

module.exports = { Order, OrderType, OrderStatus };
