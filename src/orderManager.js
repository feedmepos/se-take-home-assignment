'use strict';

class Order {
  constructor(id, type) {
    this.id = id;
    this.type = type; // 'VIP' | 'Normal'
    this.status = 'PENDING';
  }
}

class Bot {
  constructor(id) {
    this.id = id;
    this.status = 'IDLE'; // 'IDLE' | 'PROCESSING'
    this.currentOrder = null;
    this.timer = null;
  }
}

class OrderManager {
  constructor({ processingTime = 10000, log = console.log } = {}) {
    this.pendingQueue = [];
    this.completedOrders = [];
    this.bots = [];
    this.orderCounter = 1001;
    this.botCounter = 1;
    this.processingTime = processingTime;
    this.log = log;
  }

  addNormalOrder() {
    const order = new Order(this.orderCounter++, 'Normal');
    this.pendingQueue.push(order);
    this.log(`[NEW] Order #${order.id} (Normal) added to queue`);
    this._tryAssignPending();
    return order;
  }

  addVipOrder() {
    const order = new Order(this.orderCounter++, 'VIP');
    // Insert after last VIP order
    let lastVipIndex = -1;
    for (let i = this.pendingQueue.length - 1; i >= 0; i--) {
      if (this.pendingQueue[i].type === 'VIP') {
        lastVipIndex = i;
        break;
      }
    }
    this.pendingQueue.splice(lastVipIndex + 1, 0, order);
    this.log(`[NEW] Order #${order.id} (VIP) added to queue`);
    this._tryAssignPending();
    return order;
  }

  addBot() {
    const bot = new Bot(this.botCounter++);
    this.bots.push(bot);
    this.log(`[BOT] Bot #${bot.id} added`);
    this._assignOrder(bot);
    return bot;
  }

  removeBot() {
    if (this.bots.length === 0) return null;
    const bot = this.bots.pop(); // remove newest bot
    if (bot.timer !== null) {
      clearTimeout(bot.timer);
      bot.timer = null;
      const order = bot.currentOrder;
      bot.currentOrder = null;
      bot.status = 'IDLE';
      // Re-insert order at correct priority position
      this._reinsertOrder(order);
      this.log(`[BOT] Bot #${bot.id} removed — Order #${order.id} returned to PENDING`);
    } else {
      this.log(`[BOT] Bot #${bot.id} removed (was IDLE)`);
    }
    return bot;
  }

  _reinsertOrder(order) {
    // Re-insert preserving original ID order within its type's section.
    // Scan for the first same-type entry with a higher ID and insert before it;
    // if none found, append after the last entry of the same type.
    let insertAt = this.pendingQueue.length; // default: end of queue
    if (order.type === 'VIP') {
      for (let i = 0; i < this.pendingQueue.length; i++) {
        if (this.pendingQueue[i].type === 'VIP' && this.pendingQueue[i].id > order.id) {
          insertAt = i;
          break;
        }
        if (this.pendingQueue[i].type === 'Normal') {
          insertAt = i; // end of VIP section
          break;
        }
      }
    } else {
      for (let i = 0; i < this.pendingQueue.length; i++) {
        if (this.pendingQueue[i].type === 'Normal' && this.pendingQueue[i].id > order.id) {
          insertAt = i;
          break;
        }
      }
    }
    this.pendingQueue.splice(insertAt, 0, order);
    order.status = 'PENDING';
  }

  _tryAssignPending() {
    for (const bot of this.bots) {
      if (bot.status === 'IDLE' && this.pendingQueue.length > 0) {
        this._assignOrder(bot);
      }
    }
  }

  _assignOrder(bot) {
    if (this.pendingQueue.length === 0) {
      bot.status = 'IDLE';
      return;
    }
    const order = this.pendingQueue.shift();
    order.status = 'PROCESSING';
    bot.status = 'PROCESSING';
    bot.currentOrder = order;
    this._processOrder(bot, order);
  }

  _processOrder(bot, order) {
    bot.timer = setTimeout(() => {
      bot.timer = null;
      order.status = 'COMPLETE';
      this.completedOrders.push(order);
      bot.currentOrder = null;
      bot.status = 'IDLE';
      this.log(`[DONE] Order #${order.id} (${order.type}) completed by Bot #${bot.id}`);
      this._assignOrder(bot);
    }, this.processingTime);
  }

  getStatus() {
    const processing = this.bots
      .filter(b => b.status === 'PROCESSING')
      .map(b => `Bot #${b.id} → Order #${b.currentOrder.id} (${b.currentOrder.type})`);
    return {
      pending: this.pendingQueue.map(o => `#${o.id} (${o.type})`),
      processing,
      completed: this.completedOrders.map(o => `#${o.id} (${o.type})`),
      bots: this.bots.map(b => `Bot #${b.id} [${b.status}]`),
    };
  }
}

module.exports = { OrderManager, Order, Bot };
