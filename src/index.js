const readline = require('readline');
const fs = require('fs');

class System {
  constructor() {
    this.orders = [];
    this.completed = [];
    this.bots = [];
    this.orderId = 1;
    this.botId = 1;
    
    // Initialize scripts/result.txt
    const fs = require('fs');
    const path = require('path');
    this.resultFile = path.join('scripts', 'result.txt');
    
    fs.writeFileSync(this.resultFile, `McDonald's Order Management System - Simulation Results\n\n`);
    this.log('System initialized with 0 bots');
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  log(msg) {
    const time = new Date().toTimeString().split(' ')[0];
    const line = `[${time}] ${msg}\n`;
    console.log(`[${time}] ${msg}`);
    
    const fs = require('fs');
    fs.appendFileSync(this.resultFile, line);
  }

  addOrder(type) {
    const order = { id: this.orderId++, type, status: 'PENDING' };
    
    if (type === 'VIP') {
      // Insert after existing VIP orders, before Normal orders
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
    this.processOrders();
  }

  addBot() {
    const bot = { id: this.botId++, busy: false, timer: null, currentOrder: null, startTime: null };
    this.bots.push(bot);
    this.log(`Bot #${bot.id} created - Status: ACTIVE`);
    this.processOrders();
  }

  removeBot() {
    const bot = this.bots.pop();
    if (!bot) {
      console.log('No bots to remove');
      return;
    }
    
    if (bot.timer) {
      clearTimeout(bot.timer);
      if (bot.currentOrder) {
        bot.currentOrder.status = 'PENDING';
        // Maintain priority order - VIP after VIP, Normal at end
        if (bot.currentOrder.type === 'VIP') {
          const normalIndex = this.orders.findIndex(o => o.type === 'NORMAL');
          if (normalIndex === -1) {
            this.orders.push(bot.currentOrder);
          } else {
            this.orders.splice(normalIndex, 0, bot.currentOrder);
          }
        } else {
          this.orders.push(bot.currentOrder);
        }
        this.log(`Bot #${bot.id} destroyed while PROCESSING - Order #${bot.currentOrder.id} returned to queue`);
      }
    } else {
      this.log(`Bot #${bot.id} destroyed while IDLE`);
    }
  }

  processOrders() {
    const idleBot = this.bots.find(b => !b.busy);
    const pendingOrder = this.orders.shift();
    
    if (idleBot && pendingOrder) {
      idleBot.busy = true;
      idleBot.currentOrder = pendingOrder;
      idleBot.startTime = Date.now();
      pendingOrder.status = 'PROCESSING';
      
      this.log(`Bot #${idleBot.id} picked up ${pendingOrder.type} Order #${pendingOrder.id} - Status: PROCESSING`);
      
      idleBot.timer = setTimeout(() => {
        const processingTime = Math.round((Date.now() - idleBot.startTime) / 1000);
        pendingOrder.status = 'COMPLETE';
        this.completed.push(pendingOrder);
        this.log(`Bot #${idleBot.id} completed ${pendingOrder.type} Order #${pendingOrder.id} - Status: COMPLETE (Processing time: ${processingTime}s)`);
        
        idleBot.busy = false;
        idleBot.timer = null;
        idleBot.currentOrder = null;
        idleBot.startTime = null;
        
        // Check if bot should go idle or process next order
        setTimeout(() => {
          if (this.orders.length > 0) {
            this.processOrders();
          } else {
            this.log(`Bot #${idleBot.id} is now IDLE - No pending orders`);
          }
        }, 100);
      }, 10000);
    }
  }

  showStatus() {
    console.log('\n=== STATUS ===');
    console.log(`Pending: ${this.orders.length}, Completed: ${this.completed.length}`);
    console.log(`Bots: ${this.bots.length} (${this.bots.filter(b => !b.busy).length} idle)`);
    
    if (this.orders.length > 0) {
      console.log('Queue:', this.orders.map(o => `#${o.id}(${o.type})`).join(', '));
    }
    console.log('===============\n');
  }

  start() {
    console.log('McDonald\'s Order System');
    console.log('1=Normal Order, 2=VIP Order, 3=+Bot, 4=-Bot, 5=Status, 0=Quit');
    this.prompt();
  }

  prompt() {
    this.rl.question('> ', (cmd) => {
      switch (cmd) {
        case '1': this.addOrder('NORMAL'); break;
        case '2': this.addOrder('VIP'); break;
        case '3': this.addBot(); break;
        case '4': this.removeBot(); break;
        case '5': this.showStatus(); break;
        case '0': 
          // Add final status summary
          const vipCount = this.completed.filter(o => o.type === 'VIP').length;
          const normalCount = this.completed.filter(o => o.type === 'NORMAL').length;
          const totalCompleted = this.completed.length;
          const activeBots = this.bots.length;
          const pendingOrders = this.orders.length;
          
          this.log('System shutdown\n');
          
          const fs = require('fs');
          const finalStatus = `
Final Status:
- Total Orders Processed: ${totalCompleted} (${vipCount} VIP, ${normalCount} Normal)
- Orders Completed: ${totalCompleted}
- Active Bots: ${activeBots}
- Pending Orders: ${pendingOrders}`;
          
          fs.appendFileSync(this.resultFile, finalStatus);
          
          console.log('Goodbye!');
          this.rl.close();
          return;
      }
      this.prompt();
    });
  }
}

new System().start();