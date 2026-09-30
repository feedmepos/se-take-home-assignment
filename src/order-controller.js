'use strict';

const COOK_TIME_MS = 10_000;

function compareOrders(a, b) {
  if (a.type !== b.type) return a.type === 'VIP' ? -1 : 1;
  return a.id - b.id;
}

class OrderController {
  constructor({ clock = {
    now: () => new Date(),
    setTimeout: (callback, delay) => setTimeout(callback, delay),
    clearTimeout: id => clearTimeout(id)
  }, onEvent = () => {} } = {}) {
    this.clock = clock;
    this.onEvent = onEvent;
    this.nextOrderId = 1;
    this.nextBotId = 1;
    this.waiting = [];
    this.bots = [];
    this.completed = [];
  }

  addOrder(type) {
    if (type !== 'VIP' && type !== 'Normal') {
      throw new Error('Order type must be VIP or Normal');
    }
    const order = { id: this.nextOrderId++, type, status: 'PENDING' };
    this.waiting.push(order);
    this.waiting.sort(compareOrders);
    this.emit('order-added', { orderId: order.id, orderType: type });
    this.dispatch();
    return order.id;
  }

  addBot() {
    const bot = { id: this.nextBotId++, order: null, timer: null };
    this.bots.push(bot);
    this.emit('bot-added', { botId: bot.id });
    this.dispatch();
    return bot.id;
  }

  removeBot() {
    const bot = this.bots.pop();
    if (!bot) return null;
    if (bot.order) {
      this.clock.clearTimeout(bot.timer);
      bot.order.status = 'PENDING';
      this.waiting.push(bot.order);
      this.waiting.sort(compareOrders);
      this.emit('order-returned', {
        botId: bot.id,
        orderId: bot.order.id,
        orderType: bot.order.type
      });
    }
    this.emit('bot-removed', { botId: bot.id });
    this.dispatch();
    return bot.id;
  }

  snapshot() {
    const processing = this.bots.flatMap(bot => bot.order ? [bot.order] : []);
    return {
      pending: [...this.waiting, ...processing].sort(compareOrders).map(order => ({ ...order })),
      complete: this.completed.map(order => ({ ...order })),
      bots: this.bots.map(bot => ({
        id: bot.id,
        status: bot.order ? 'PROCESSING' : 'IDLE',
        orderId: bot.order?.id ?? null
      }))
    };
  }

  dispatch() {
    for (const bot of this.bots) {
      if (bot.order || this.waiting.length === 0) continue;
      const order = this.waiting.shift();
      order.status = 'PROCESSING';
      bot.order = order;
      this.emit('order-started', { botId: bot.id, orderId: order.id, orderType: order.type });
      bot.timer = this.clock.setTimeout(() => {
        // A cancelled timer should never fire, but this also guards against stale callbacks.
        if (bot.order !== order || !this.bots.includes(bot)) return;
        order.status = 'COMPLETE';
        bot.order = null;
        bot.timer = null;
        this.completed.push(order);
        this.emit('order-completed', { botId: bot.id, orderId: order.id, orderType: order.type });
        this.dispatch();
        if (!bot.order) this.emit('bot-idle', { botId: bot.id });
      }, COOK_TIME_MS);
    }
  }

  emit(type, details) {
    this.onEvent({ time: this.clock.now(), type, ...details });
  }
}

module.exports = { OrderController, COOK_TIME_MS };
