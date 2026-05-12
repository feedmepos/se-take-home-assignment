const fs = require('fs');
class BotManager {
  constructor(queue) {
    this.queue = queue;
    this.bots = [];
    this.botId = 1;
    this.completedOrders = 0;
  }

  addBot() {
    const bot = {
      id: this.botId++,
      busy: false,
      currentOrder: null,
      timer: null
    };

      this.bots.push(bot);
      const time = new Date().toLocaleString('en-GB', { hour12: false });
      fs.appendFileSync("scripts/result.txt", `${time} Bot ${bot.id} added\n`);
      console.log(`Bot ${bot.id} added`);
      this.process(bot);
  }

  removeBot() {
    if (this.bots.length === 0) return;

    const bot = this.bots.pop();
    const time = new Date().toLocaleString('en-GB', { hour12: false });
    fs.appendFileSync("scripts/result.txt", `${time} Bot ${bot.id} removed\n`);
    console.log(`Bot ${bot.id} removed`);

    if (bot.busy) {
        clearTimeout(bot.timer);
        const time = new Date().toLocaleString('en-GB', { hour12: false });
    fs.appendFileSync("scripts/result.txt", `${time} Order ${bot.currentOrder.id} returned to queue\n`);
    console.log(`Order ${bot.currentOrder.id} returned to queue`);
    this.queue.returnOrder(bot.currentOrder);
    }
  }

  process(bot) {
    if (bot.busy || this.queue.isEmpty()) return;

    const order = this.queue.getNextOrder();
    if (!order) return;

    bot.busy = true;
    bot.currentOrder = order;
      const time = new Date().toLocaleString('en-GB', { hour12: false });
    fs.appendFileSync("scripts/result.txt", `${time} Bot ${bot.id} processing Order ${order.id} - Pending\n`);
    console.log(`${time} Bot ${bot.id} processing Order ${order.id} - Pending`);

    bot.timer = setTimeout(() => {
      bot.busy = false;

        const time = new Date().toLocaleString('en-GB', { hour12: false });
      fs.appendFileSync("scripts/result.txt", `${time} Order ${order.id} completed\n`);

      console.log(`${time} Order ${order.id} completed`);
      this.completedOrders++;
      bot.currentOrder = null;

      this.process(bot); // process next
    }, 10000);
  }

  triggerAll() {
    this.bots.forEach(bot => this.process(bot));
    }
    getActiveBots() {
    return this.bots.length;
  }

  getCompletedOrders() {
    return this.completedOrders;
  }

  getBusyBots() {
    return this.bots.filter(bot => bot.busy).length;
  }
}

module.exports = BotManager;