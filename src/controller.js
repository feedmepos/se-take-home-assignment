'use strict';

const PRIORITY = { VIP: 0, NORMAL: 1 };

class OrderController {
  constructor({ processingMs = 10_000, now = () => new Date(), setTimer = setTimeout,
    clearTimer = clearTimeout, onEvent = () => {} } = {}) {
    if (!Number.isFinite(processingMs) || processingMs <= 0) {
      throw new RangeError('processingMs must be positive');
    }
    this.processingMs = processingMs;
    this.now = now;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.onEvent = onEvent;
    this.nextOrderId = 1;
    this.nextBotId = 1;
    this.pending = [];
    this.complete = [];
    this.bots = [];
  }

  emit(message) {
    this.onEvent({ time: this.now(), message });
  }

  addOrder(type) {
    if (!Object.hasOwn(PRIORITY, type)) {
      throw new Error('Order type must be VIP or NORMAL');
    }
    const order = { id: this.nextOrderId++, type };
    this.insertPending(order);
    this.emit(`${type} order #${order.id} added to PENDING`);
    this.dispatch();
    return order.id;
  }

  insertPending(order) {
    // The increasing order ID preserves each class's original FIFO position,
    // including when a cancelled order returns from a bot.
    const index = this.pending.findIndex(other =>
      PRIORITY[other.type] > PRIORITY[order.type] ||
      (other.type === order.type && other.id > order.id));
    this.pending.splice(index < 0 ? this.pending.length : index, 0, order);
  }

  addBot() {
    const bot = { id: this.nextBotId++, order: null, timer: null };
    this.bots.push(bot);
    this.emit(`Bot #${bot.id} created (IDLE)`);
    this.dispatch();
    return bot.id;
  }

  removeNewestBot() {
    const bot = this.bots.pop();
    if (!bot) {
      this.emit('No bot to remove');
      return null;
    }
    if (bot.timer !== null) {
      this.clearTimer(bot.timer);
      this.insertPending(bot.order);
      this.emit(`Bot #${bot.id} stopped; ${bot.order.type} order #${bot.order.id} returned to PENDING`);
    }
    this.emit(`Bot #${bot.id} removed`);
    this.dispatch();
    return bot.id;
  }

  dispatch() {
    for (const bot of this.bots) {
      if (bot.order || this.pending.length === 0) continue;
      const order = this.pending.shift();
      bot.order = order;
      this.emit(`Bot #${bot.id} picked up ${order.type} order #${order.id} (PROCESSING)`);
      bot.timer = this.setTimer(() => {
        // A cancelled timer must never complete an order.
        if (bot.order !== order || !this.bots.includes(bot)) return;
        bot.order = null;
        bot.timer = null;
        this.complete.push(order);
        this.emit(`Bot #${bot.id} completed ${order.type} order #${order.id} (COMPLETE; ${this.processingMs / 1000}s)`);
        this.dispatch();
        if (!bot.order) this.emit(`Bot #${bot.id} is IDLE`);
      }, this.processingMs);
    }
  }

  getState() {
    return {
      pending: this.pending.map(order => ({ ...order })),
      processing: this.bots.filter(bot => bot.order).map(bot =>
        ({ botId: bot.id, order: { ...bot.order } })),
      complete: this.complete.map(order => ({ ...order })),
      bots: this.bots.map(bot => ({ id: bot.id, status: bot.order ? 'PROCESSING' : 'IDLE' }))
    };
  }
}

module.exports = { OrderController };
