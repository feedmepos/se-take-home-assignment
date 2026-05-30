const Bot = require('../models/bot');

class BotController {
  constructor() {
    this.bots = [];
    this.nextBotId = 1;
  }

  addBot() {
    const bot = new Bot(this.nextBotId++);
    this.bots.push(bot);
    return bot;
  }

  removeLatestBot() {
    if (this.bots.length === 0) {
      return null;
    }

    return this.bots.pop();
  }

  findIdleBot() {
    return this.bots.find((bot) => bot.isIdle) || null;
  }

  includes(bot) {
    return this.bots.includes(bot);
  }

  getCount() {
    return this.bots.length;
  }

  getAll() {
    return this.bots;
  }
}

module.exports = BotController;
