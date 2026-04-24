'use strict';

const { EventEmitter } = require('events');

class Order {
  constructor(id, type) {
    this.id = id;
    this.type = type; // 'normal' | 'vip'
  }

  toString() {
    return `#${this.id}(${this.type.toUpperCase()})`;
  }
}

class Bot {
  constructor(id) {
    this.id = id;
    this.currentOrder = null;
    this.timer = null;
  }

  get idle() {
    return this.currentOrder === null;
  }
}

// Events emitted:
//   orderAdded(order)
//   botAdded(bot)
//   botRemoved(bot)
//   botPickedUp(bot, order)
//   orderCompleted(bot, order)
//   orderReturned(bot, order)
//   botIdle(bot)
class OrderController extends EventEmitter {
  constructor(processingTime = 10000) {
    super();
    this._processingTime = processingTime;
    this._nextOrderId = 1;
    this._nextBotId = 1;
    this.pending = [];
    this.complete = [];
    this.bots = [];
  }

  addNormalOrder() {
    const order = new Order(this._nextOrderId++, 'normal');
    this.pending.push(order);
    this._dispatchToIdleBots();
    this.emit('orderAdded', order);
    return order;
  }

  addVIPOrder() {
    const order = new Order(this._nextOrderId++, 'vip');
    this.pending.splice(this._lastVIPIndex() + 1, 0, order);
    this._dispatchToIdleBots();
    this.emit('orderAdded', order);
    return order;
  }

  addBot() {
    const bot = new Bot(this._nextBotId++);
    this.bots.push(bot);
    this._processNext(bot);
    this.emit('botAdded', bot);
    return bot;
  }

  removeBot() {
    if (this.bots.length === 0) return null;
    const bot = this.bots.pop();
    clearTimeout(bot.timer);
    bot.timer = null;
    if (bot.currentOrder) {
      const order = bot.currentOrder;
      bot.currentOrder = null;
      this._requeue(order);
      this.emit('orderReturned', bot, order);
    }
    this.emit('botRemoved', bot);
    return bot;
  }

  _lastVIPIndex() {
    let index = -1;
    for (let i = 0; i < this.pending.length; i++) {
      if (this.pending[i].type === 'vip') index = i;
    }
    return index;
  }

  // Re-insert a returned order maintaining VIP/Normal priority.
  // VIP → after the last VIP in pending (same rule as addVIPOrder).
  // Normal → end of pending (same rule as addNormalOrder).
  _requeue(order) {
    if (order.type === 'vip') {
      this.pending.splice(this._lastVIPIndex() + 1, 0, order);
    } else {
      this.pending.push(order);
    }
  }

  _processNext(bot) {
    if (this.pending.length === 0) {
      this.emit('botIdle', bot);
      return;
    }
    const order = this.pending.shift();
    bot.currentOrder = order;
    this.emit('botPickedUp', bot, order);
    bot.timer = setTimeout(() => {
      bot.currentOrder = null;
      bot.timer = null;
      this.complete.push(order);
      this.emit('orderCompleted', bot, order);
      this._processNext(bot);
    }, this._processingTime);
  }

  _dispatchToIdleBots() {
    for (const bot of this.bots) {
      if (bot.idle && this.pending.length > 0) {
        this._processNext(bot);
      }
    }
  }
}

module.exports = { OrderController, Order, Bot };
