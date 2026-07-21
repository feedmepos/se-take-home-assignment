'use strict';

const OrderType = Object.freeze({ NORMAL: 'NORMAL', VIP: 'VIP' });
const OrderStatus = Object.freeze({ PENDING: 'PENDING', PROCESSING: 'PROCESSING', COMPLETE: 'COMPLETE' });

/** A customer order. The controller numbers it; ids increase across both types. */
class Order {
  #id;
  #type;
  #status = OrderStatus.PENDING;

  constructor(id, type) {
    if (type !== OrderType.NORMAL && type !== OrderType.VIP) {
      throw new Error(`Unknown order type: ${type}`);
    }
    this.#id = id;
    this.#type = type;
  }

  get id() {
    return this.#id;
  }

  get type() {
    return this.#type;
  }

  get status() {
    return this.#status;
  }

  get isVip() {
    return this.#type === OrderType.VIP;
  }

  markPending() {
    this.#status = OrderStatus.PENDING;
  }

  markProcessing() {
    this.#status = OrderStatus.PROCESSING;
  }

  markCompleted() {
    this.#status = OrderStatus.COMPLETE;
  }
}

module.exports = { Order, OrderType, OrderStatus };
