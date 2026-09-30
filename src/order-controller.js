'use strict';

const realClock = {
  now: () => Date.now(),
  setTimeout: (callback, delay) => setTimeout(callback, delay),
  clearTimeout: (timer) => clearTimeout(timer),
};

class OrderController {
  constructor({ clock = realClock, processingMs = 10_000, onEvent = () => {} } = {}) {
    if (!Number.isInteger(processingMs) || processingMs <= 0) {
      throw new RangeError('processingMs must be a positive integer');
    }
    this.clock = clock;
    this.processingMs = processingMs;
    this.onEvent = onEvent;
    this.nextOrderId = 1;
    this.nextBotId = 1;
    this.pending = [];
    this.complete = [];
    this.bots = [];
  }

  addOrder(type) {
    if (type !== 'VIP' && type !== 'Normal') {
      throw new TypeError('order type must be VIP or Normal');
    }
    const order = { id: this.nextOrderId++, type };
    this.insertPending(order);
    this.emit(`Created ${type} Order #${order.id} - PENDING`);
    this.dispatch();
    return order.id;
  }

  addBot() {
    const bot = { id: this.nextBotId++, order: null, timer: null };
    this.bots.push(bot);
    this.emit(`Added Bot #${bot.id} - IDLE`);
    this.dispatch();
    return bot.id;
  }

  removeBot() {
    const bot = this.bots.pop();
    if (!bot) {
      this.emit('No bot to remove');
      return null;
    }
    if (bot.order) {
      this.clock.clearTimeout(bot.timer);
      this.insertPending(bot.order);
      this.emit(`Removed Bot #${bot.id}; ${bot.order.type} Order #${bot.order.id} returned to PENDING`);
    } else {
      this.emit(`Removed Bot #${bot.id} while IDLE`);
    }
    this.dispatch();
    return bot.id;
  }

  // The original order number gives FIFO order within each priority class,
  // including when a canceled order returns to the queue.
  insertPending(order) {
    const priority = (item) => item.type === 'VIP' ? 0 : 1;
    const index = this.pending.findIndex((item) =>
      priority(item) > priority(order) ||
      (priority(item) === priority(order) && item.id > order.id));
    this.pending.splice(index < 0 ? this.pending.length : index, 0, order);
  }

  dispatch() {
    for (const bot of this.bots) {
      if (bot.order || this.pending.length === 0) continue;
      const order = this.pending.shift();
      bot.order = order;
      this.emit(`Bot #${bot.id} picked up ${order.type} Order #${order.id} - PROCESSING`);
      bot.timer = this.clock.setTimeout(() => {
        // Cancellation clears the timer; this guard also protects against a
        // stale callback from a scheduler that has already queued it.
        if (bot.order !== order || !this.bots.includes(bot)) return;
        bot.order = null;
        bot.timer = null;
        this.complete.push(order);
        this.emit(`Bot #${bot.id} completed ${order.type} Order #${order.id} - COMPLETE (10 seconds)`);
        if (this.pending.length === 0) this.emit(`Bot #${bot.id} is IDLE`);
        this.dispatch();
      }, this.processingMs);
    }
  }

  getState() {
    return {
      pending: this.pending.map((order) => ({ ...order })),
      processing: this.bots.filter((bot) => bot.order).map((bot) => ({
        botId: bot.id, order: { ...bot.order },
      })),
      complete: this.complete.map((order) => ({ ...order })),
      bots: this.bots.map((bot) => ({
        id: bot.id, status: bot.order ? 'PROCESSING' : 'IDLE',
      })),
    };
  }

  shutdown() {
    for (const bot of this.bots) {
      if (bot.timer !== null) this.clock.clearTimeout(bot.timer);
    }
  }

  emit(message) {
    this.onEvent({ time: this.clock.now(), message });
  }
}

module.exports = { OrderController };
