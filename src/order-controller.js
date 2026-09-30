'use strict';

const PROCESSING_MS = 10_000;

class OrderController {
  constructor({ now = () => Date.now(), setTimer = setTimeout, clearTimer = clearTimeout, log = () => {} } = {}) {
    this.now = now;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.log = log;
    this.nextOrderId = 1;
    this.nextBotId = 1;
    this.pending = [];
    this.complete = [];
    this.bots = [];
  }

  addOrder(type) {
    if (type !== 'VIP' && type !== 'Normal') {
      throw new Error('Order type must be VIP or Normal');
    }
    const order = { id: this.nextOrderId++, type, status: 'PENDING' };
    this._enqueue(order);
    this._emit(`Created ${type} Order #${order.id} - PENDING`);
    this._dispatch();
    return order.id;
  }

  addBot() {
    const bot = { id: this.nextBotId++, order: null, timer: null };
    this.bots.push(bot);
    this._emit(`Bot #${bot.id} created`);
    this._dispatch();
    if (bot.order === null) this._emit(`Bot #${bot.id} is IDLE`);
    return bot.id;
  }

  removeBot() {
    const bot = this.bots.pop();
    if (!bot) {
      this._emit('No bot to remove');
      return null;
    }
    if (bot.order !== null) {
      this.clearTimer(bot.timer);
      const order = bot.order;
      order.status = 'PENDING';
      this._enqueue(order);
      this._emit(`Bot #${bot.id} stopped; ${order.type} Order #${order.id} returned to PENDING`);
    } else {
      this._emit(`Bot #${bot.id} destroyed while IDLE`);
    }
    this._dispatch();
    return bot.id;
  }

  getState() {
    return {
      pending: this.pending.map(({ id, type, status }) => ({ id, type, status })),
      processing: this.bots.filter(bot => bot.order).map(bot => ({
        botId: bot.id, orderId: bot.order.id, type: bot.order.type
      })),
      complete: this.complete.map(({ id, type, status }) => ({ id, type, status })),
      bots: this.bots.map(bot => ({ id: bot.id, status: bot.order ? 'PROCESSING' : 'IDLE' }))
    };
  }

  shutdown() {
    for (const bot of this.bots) {
      if (bot.timer !== null) this.clearTimer(bot.timer);
    }
  }

  _enqueue(order) {
    this.pending.push(order);
    this.pending.sort((a, b) => (a.type === b.type ? a.id - b.id : a.type === 'VIP' ? -1 : 1));
  }

  _dispatch() {
    for (const bot of this.bots) {
      if (bot.order !== null || this.pending.length === 0) continue;
      const order = this.pending.shift();
      order.status = 'PROCESSING';
      bot.order = order;
      this._emit(`Bot #${bot.id} picked up ${order.type} Order #${order.id} - PROCESSING`);
      bot.timer = this.setTimer(() => {
        if (bot.order !== order || !this.bots.includes(bot)) return;
        bot.order = null;
        bot.timer = null;
        order.status = 'COMPLETE';
        this.complete.push(order);
        this._emit(`Bot #${bot.id} completed ${order.type} Order #${order.id} - COMPLETE (10s)`);
        this._dispatch();
        if (bot.order === null) this._emit(`Bot #${bot.id} is IDLE`);
      }, PROCESSING_MS);
    }
  }

  _emit(message) {
    const time = new Date(this.now()).toISOString().slice(11, 19);
    this.log(`[${time}] ${message}`);
  }
}

module.exports = { OrderController, PROCESSING_MS };
