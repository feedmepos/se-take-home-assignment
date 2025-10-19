import fs from 'fs';
import path from 'path';
import { getTime } from './utils.js';

export class OrderController {
  constructor() {
    this.orders = [];
    this.bots = [];
    this.timers = new Map(); // <--- add this
    this.nextOrderId = 1;
    this.nextBotId = 1;

    const scriptsDir = path.resolve('./scripts');
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true });
    }

    this.resultFile = path.join(scriptsDir, 'result.txt');
    fs.writeFileSync(this.resultFile, '');
  }

  log(message) {
    const line = `[${getTime()}] ${message}\n`;
    console.log(line.trim());
    fs.appendFileSync(this.resultFile, line);
  }

  addOrder(type = 'Normal') {
    const order = {
      id: this.nextOrderId++,
      type,
      status: 'PENDING',
      createdAt: getTime(),
    };

    // Insert VIP before normal orders
    if (type === 'VIP') {
      const vipEnd = this.orders.findLastIndex(o => o.type === 'VIP');
      if (vipEnd !== -1) this.orders.splice(vipEnd + 1, 0, order);
      else this.orders.unshift(order);
    } else {
      this.orders.push(order);
    }

    this.log(`${type} Order #${order.id} added (PENDING)`);
    this.showSummary();
    this.assignOrders();
  }

  addBot() {
    const bot = { id: this.nextBotId++, status: 'IDLE', currentOrder: null };
    this.bots.push(bot);
    this.log(`Bot #${bot.id} added`);
    this.showSummary();
    this.assignOrders();
  }

  removeBot() {
    if (this.bots.length === 0) return this.log(`No bots to remove`);
    const bot = this.bots.pop();
    this.log(`Bot #${bot.id} removed`);

    if (bot.currentOrder) {
        const order = bot.currentOrder;

        // Cancel timer if running
        if (this.timers.has(order.id)) {
        clearTimeout(this.timers.get(order.id));
        this.timers.delete(order.id);
        this.log(`Processing for Order #${order.id} cancelled`);
        }

        // Reset status
        order.status = 'PENDING';
        delete order.completedAt;
        bot.currentOrder = null;

        // Prevent duplicates before re-adding
        if (!this.orders.find(o => o.id === order.id)) {
        this.orders.unshift(order);
        this.log(`Order #${order.id} returned to PENDING`);
        } else {
        this.log(`Skipped re-adding Order #${order.id} (already in queue)`);
        }
    }
  }

  assignOrders() {
    for (const bot of this.bots) {
      if (bot.status === 'IDLE') {
        const next = this.orders.find(o => o.status === 'PENDING');
        if (next) this.processOrder(bot, next);
      }
    }
  }

  processOrder(bot, order) {
    bot.status = 'BUSY';
    bot.currentOrder = order;
    order.status = 'PROCESSING';
    this.log(`Bot #${bot.id} processing Order #${order.id}`);

    const timer = setTimeout(() => {
        // If this order was cancelled and requeued, skip completion
        if (order.status === 'PENDING') return;

        order.status = 'COMPLETE';
        order.completedAt = getTime();
        this.log(`Order #${order.id} completed`);

        bot.status = 'IDLE';
        bot.currentOrder = null;
        this.timers.delete(order.id);
        this.assignOrders();
    }, 10000);

    this.timers.set(order.id, timer);
  }

  showSummary() {
    const pending = this.orders.filter(o => o.status === 'PENDING');
    const processing = this.orders.filter(o => o.status === 'PROCESSING');
    const complete = this.orders.filter(o => o.status === 'COMPLETE');

    const summary = `
================= SYSTEM STATUS =================
🕒 ${getTime()}

Bots:
${this.bots
  .map(
    (b) =>
      `  • Bot #${b.id}: ${b.status}${
        b.currentOrder ? ` (Order #${b.currentOrder.id})` : ''
      }`
  )
  .join('\n') || '  No bots available'}

Orders:
  PENDING:   [${pending.map((o) => `${o.type}#${o.id}`).join(', ') || 'None'}]
  PROCESSING:[${processing
    .map((o) => `${o.type}#${o.id}`)
    .join(', ') || 'None'}]
  COMPLETE:  [${complete.map((o) => `${o.type}#${o.id}`).join(', ') || 'None'}]
=================================================
`;
    console.log(summary);
    fs.appendFileSync(this.resultFile, summary + '\n');
  }
}
