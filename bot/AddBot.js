import Bot from "./Bot.js";

class AddBot {
  #storage;
  #fileLogger;

  constructor(storage, fileLogger) {
    this.#storage = storage;
    this.#fileLogger = fileLogger;
  }

  #getBotNumber() {
    return this.#storage.getBotArray().length;
  }

  execute() {
    this.#storage.addBot(new Bot());

    this.#fileLogger.log(`Bot #${this.#getBotNumber()} created - Status: IDLE`);
  }
}

export default AddBot;
