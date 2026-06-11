const fs = require('fs');
const path = require('path');

// Automated demo for GitHub Actions
class DemoSystem {
  constructor() {
    this.orders = [];
    this.completed = [];
    this.bots = [];
    this.orderId = 1;
    this.botId = 1;
    this.resultFile = path.join('scripts', 'result.txt');
    
    fs.writeFileSync(this.resultFile, `McDonald's Order Management System - Simulation Results\n\n`);
    this.log('System initialized with 0 bots');
  }

  log(msg) {
    const time = new Date().toTimeString().split(' ')[0];
    const line = `[${time}] ${msg}\n`;
    console.log(`[${time}] ${msg}`);
    fs.appendFileSync(this.resultFile, line);
  }

  addOrder(type) {
    const order = { id: this.orderId++, type, status: 'PENDING' };
    
    if (type === 'VIP') {
      const normalIndex = this.orders.findIndex(o => o.type === 'NORMAL');
      if (normalIndex === -1) {
        this.orders.push(order);
      } else {
        this.orders.splice(normalIndex, 0, order);
      }
    } else {
      this.orders.push(order);
    }
    
    this.log(`Created ${type} Order #${order.id} - Status: PENDING`);
    return order;
  }

  addBot() {
    const bot = { id: this.botId++, busy: false };
    this.bots.push(bot);
    this.log(`Bot #${bot.id} created - Status: ACTIVE`);
    return bot;
  }

  async processOrder(bot, order) {
    order.status = 'PROCESSING';
    bot.busy = true;
    const startTime = Date.now();
    this.log(`Bot #${bot.id} picked up ${order.type} Order #${order.id} - Status: PROCESSING`);
    
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const processingTime = Math.round((Date.now() - startTime) / 1000);
    order.status = 'COMPLETE';
    this.completed.push(order);
    bot.busy = false;
    this.log(`Bot #${bot.id} completed ${order.type} Order #${order.id} - Status: COMPLETE (Processing time: ${processingTime}s)`);
    
    if (this.orders.length === 0) {
      this.log(`Bot #${bot.id} is now IDLE - No pending orders`);
    }
  }

  async runDemo() {
    // Create orders
    this.addOrder('NORMAL');
    await this.sleep(1000);
    
    this.addOrder('VIP');
    await this.sleep(1000);
    
    this.addOrder('NORMAL');
    await this.sleep(1000);
    
    // Add bot and process VIP first
    const bot1 = this.addBot();
    await this.sleep(500);
    
    const vipOrder = this.orders.shift();
    await this.processOrder(bot1, vipOrder);
    
    // Process remaining orders
    while (this.orders.length > 0) {
      const order = this.orders.shift();
      await this.processOrder(bot1, order);
    }
    
    // Final summary
    const vipCount = this.completed.filter(o => o.type === 'VIP').length;
    const normalCount = this.completed.filter(o => o.type === 'NORMAL').length;
    
    this.log('System shutdown\n');
    
    const finalStatus = `
Final Status:
- Total Orders Processed: ${this.completed.length} (${vipCount} VIP, ${normalCount} Normal)
- Orders Completed: ${this.completed.length}
- Active Bots: ${this.bots.length}
- Pending Orders: ${this.orders.length}`;
    
    fs.appendFileSync(this.resultFile, finalStatus);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run demo
new DemoSystem().runDemo().catch(console.error);