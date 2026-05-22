import BotStatus from "./BotStatus.js";

class RemoveBot {
  #storage;
  #fileLogger;

  constructor(storage, fileLogger) {
    this.#storage = storage;
    this.#fileLogger = fileLogger;
  }

  #getBotNumber() {
    return this.#storage.getBotArray().length + 1;
  }

  execute() {
    const bot = this.#storage.removeNewestBot();

    if (bot.status === BotStatus.PROCESSING) {
      clearTimeout(bot.timeoutId);
      this.#storage.addOrder(bot.order, 0);

      this.#fileLogger.log(
        `Bot #${this.#getBotNumber()} destroyed while PROCESSING`
      );
    } else {
      this.#fileLogger.log(`Bot #${this.#getBotNumber()} destroyed while IDLE`);
    }
  }
}

export default RemoveBot;
