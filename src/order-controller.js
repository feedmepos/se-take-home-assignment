'use strict';

const { Order } = require('./order');
const { Bot } = require('./bot');
const { OrderQueue } = require('./order-queue');

class OrderController {
  constructor(processingTime = 10000) {
    this.queue = new OrderQueue();
    this.bots = [];
    this.completed = [];
    this.nextOrderId = 1;
    this.nextBotId = 1;
    this.processingTime = processingTime;

    // Event callbacks — set by entry points for logging
    this.onBotPickup = null;    // (bot, order, waitSeconds) => {}
    this.onBotCompleted = null; // (bot, order) => {}
    this.onBotIdle = null;      // (bot) => {}
  }

  addNormalOrder() {
    const order = new Order(this.nextOrderId++, 'NORMAL');
    this.queue.enqueue(order);
    this.processNextOrder();
    return order;
  }

  addVipOrder() {
    const order = new Order(this.nextOrderId++, 'VIP');
    this.queue.enqueue(order);
    this.processNextOrder();
    return order;
  }

  addBot() {
    const bot = new Bot(this.nextBotId++, this.processingTime);
    this.bots.push(bot);
    this.processNextOrder();
    return bot;
  }

  removeBot() {
    if (this.bots.length === 0) {
      return null;
    }

    const bot = this.bots.pop(); // Remove newest (last added)
    const returnedOrder = bot.stopProcessing();

    if (returnedOrder) {
      this.queue.enqueue(returnedOrder);
    }

    return { bot, returnedOrder };
  }

  processNextOrder() {
    for (const bot of this.bots) {
      if (bot.status === 'IDLE' && !this.queue.isEmpty()) {
        const order = this.queue.dequeue();
        const waitSeconds = Math.round((Date.now() - order.createdAt.getTime()) / 1000);

        bot.startProcessing(order, (completedOrder) => {
          this.completed.push(completedOrder);

          if (this.onBotCompleted) {
            this.onBotCompleted(bot, completedOrder);
          }

          if (!this.queue.isEmpty()) {
            this.processNextOrder();
          } else if (this.onBotIdle) {
            this.onBotIdle(bot);
          }
        });

        if (this.onBotPickup) {
          this.onBotPickup(bot, order, waitSeconds);
        }
      }
    }
  }

  getStatus() {
    const pending = this.queue.toArray();
    const processing = this.bots
      .filter(b => b.status === 'PROCESSING')
      .map(b => b.currentOrder);

    const totalOrders = this.completed.length + pending.length + processing.length;
    const vipCount = [...this.completed, ...pending, ...processing].filter(o => o.type === 'VIP').length;
    const normalCount = totalOrders - vipCount;
    const workingBots = this.bots.filter(b => b.status === 'PROCESSING').length;
    const idleBots = this.bots.filter(b => b.status === 'IDLE').length;

    // Average wait time (time from creation to pickup for completed orders)
    let avgWaitTime = 0;
    const ordersWithPickup = this.completed.filter(o => o.pickedUpAt);
    if (ordersWithPickup.length > 0) {
      const totalWait = ordersWithPickup.reduce((sum, o) => {
        return sum + (o.pickedUpAt.getTime() - o.createdAt.getTime()) / 1000;
      }, 0);
      avgWaitTime = totalWait / ordersWithPickup.length;
    }

    return {
      bots: this.bots,
      pending,
      processing,
      completed: this.completed,
      summary: {
        totalOrders,
        vipCount,
        normalCount,
        completedCount: this.completed.length,
        pendingCount: pending.length,
        processingCount: processing.length,
        activeBots: this.bots.length,
        workingBots,
        idleBots,
        avgWaitTime: Math.round(avgWaitTime * 100) / 100
      }
    };
  }
}

module.exports = { OrderController };
