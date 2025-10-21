const { orderService, setBotService } = require("./orderService.js");
const { log } = require("../utils/logger");

class BotService {
  constructor() {
    this.bots = [];
    this.processing = new Map(); // botId -> order
    this.nextBotId = 0;
    this.PROCESSING_TIME_MS = 10000; // 10 seconds per order
    log("System initialized with 0 bots");
  }

  addBot() {
    const botStatus = orderService.pending.length > 0 ? "ACTIVE" : "IDLE";
    const bot = { id: ++this.nextBotId, status: botStatus };
    this.bots.push(bot);
    log(`Bot #${bot.id} created - Status: ${botStatus}`);
    this.processNext();
    return bot;
  }

  removeBot() {
    if (this.bots.length === 0) return null;

    const bot = this.bots.pop();
    const processingOrder = this.processing.get(bot.id);

    if (processingOrder) {
      clearTimeout(bot.timeoutRef);
      this.processing.delete(bot.id);
      orderService.returnToPending(processingOrder);
    }

    log(`Bot #${bot.id} destroyed while ${bot.status}`);

    return bot;
  }

  processNext() {
    this.bots.forEach((bot) => {
      if (!this.processing.has(bot.id)) {
        const order = orderService.getNextPending();
        if (order) {
          this.processing.set(bot.id, order);
          order.status = "PROCESSING";
          log(
            `Bot #${bot.id} picked up ${order.type} Order #${order.id} - Status: ${order.status}`
          );

          bot.timeoutRef = setTimeout(() => {
            orderService.completeOrder(
              order,
              bot.id,
              this.PROCESSING_TIME_MS / 1000
            );
            this.processing.delete(bot.id);
            bot.status = "IDLE";
            this.processNext(); // immediately pick next order if available
          }, this.PROCESSING_TIME_MS);
        } else {
          log(`Bot #${bot.id} is now ${bot.status} - No pending orders`);
        }
      }
    });
  }

  getBots() {
    return {
      active: this.bots.filter((bot) => bot.status === "ACTIVE").length,
      idle: this.bots.filter((bot) => bot.status === "IDLE").length,
    };
  }
}

const botService = new BotService();
setBotService(botService);

module.exports = botService;
