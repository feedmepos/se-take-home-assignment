const fs = require("fs");
const path = require("path");

class BotManager {
  constructor(orderManager) {
    this.orderManager = orderManager;
    this.bots = [];
    this.botCounter = 0;
    this.outputFile = path.join(__dirname, "../scripts/result.txt");
    fs.writeFileSync(this.outputFile, ""); // clear result.txt
  }

  log(message) {
    const time = new Date().toLocaleTimeString("en-GB", { hour12: false });
    const line = `[${time}] BOT    -- ${message}\n`;
    fs.appendFileSync(this.outputFile, line);
    console.log(line.trim());
  }

  addBot() {
    const botId = ++this.botCounter;
    const bot = { id: botId, busy: false, currentOrder: null, stop: false };
    this.bots.push(bot);
    this.log(`Bot#${botId} added.`);
    this.processNext(bot);
  }

  getBotCount(val) {
    let botCount = this.bots.length;
    if (!botCount && !val) {
      this.log(`No bots available. Please add a bot first.`);
    }
    if (val) {
      this.log(`Current bot count: ${botCount}`);
    }
    return botCount;
  }

  removeBot() {
    const bot = this.bots.pop();
    if (!bot) return this.log("No bots to remove.");

    if (bot.busy && bot.currentOrder) {
      this.log(
        `Bot#${bot.id} removed while processing Order#${bot.currentOrder.id}. Returning order to pending.`
      );
      this.orderManager.returnToPending(bot.currentOrder);
    } else {
      this.log(`Bot#${bot.id} removed.`);
    }

    bot.stop = true;
  }

  async processNext(bot) {
    if (bot.stop || bot.busy) return;

    const nextOrder = this.orderManager.getNextOrder();
    if (!nextOrder) {
      bot.busy = false;
      this.log(`Bot#${bot.id} is IDLE.`);
      return;
    }

    bot.busy = true;
    bot.currentOrder = nextOrder;
    this.log(
      `Bot#${bot.id} started processing Order#${nextOrder.id} (${nextOrder.type}).`
    );

    // Simulate 10-second processing
    setTimeout(() => {
      if (bot.stop) {
        this.log(
          `Bot#${bot.id} stopped mid-way. Order#${nextOrder.id} returned to pending.`
        );
        this.orderManager.returnToPending(nextOrder);
        return;
      }

      this.orderManager.moveToComplete(nextOrder);
      this.log(`Bot#${bot.id} completed Order#${nextOrder.id}.`);
      bot.busy = false;
      bot.currentOrder = null;

      this.processNext(bot);
    }, 10000);
  }
}

module.exports = BotManager;
