'use strict';

const OrderType = Object.freeze({ NORMAL: 'NORMAL', VIP: 'VIP' });
const OrderStatus = Object.freeze({ PENDING: 'PENDING', PROCESSING: 'PROCESSING', COMPLETE: 'COMPLETE' });

/** A customer order. Ids are unique and increasing across both types. */
class Order {
  static #nextId = 1;

  #id;
  #type;
  #status = OrderStatus.PENDING;

  /** Test hook, so each scenario starts numbering from #1. */
  static resetSequence() {
    Order.#nextId = 1;
  }

  constructor(type) {
    if (type !== OrderType.NORMAL && type !== OrderType.VIP) {
      throw new Error(`Unknown order type: ${type}`);
    }
    this.#id = Order.#nextId++;
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
