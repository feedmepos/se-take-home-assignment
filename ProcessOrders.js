import BotStatus from "./bot/BotStatus.js";

class ProcessOrders {
  #storage;
  #fileLogger;
  #botProcessingTimeInMillis;

  constructor(storage, fileLogger, botProcessingTimeInMillis = 10000) {
    this.#storage = storage;
    this.#fileLogger = fileLogger;
    this.#botProcessingTimeInMillis = botProcessingTimeInMillis;
  }

  execute() {
    const botArray = this.#storage.getBotArray();

    botArray.forEach((bot, index) => {
      const latestPendingOrderArray = this.#storage.getPendingOrderArray();

      if (bot.status === BotStatus.IDLE && latestPendingOrderArray.length > 0) {
        const order = latestPendingOrderArray[0];
        this.#storage.setPendingOrderArray(latestPendingOrderArray.slice(1));
        this.#storage.updateBotStatus(index, BotStatus.PROCESSING);
        this.#storage.updateBotOrder(index, order);
        this.#storage.updateBotTimeoutId(
          index,
          setTimeout(() => {
            this.#storage.addCompletedOrder(order);
            this.#storage.updateBotStatus(index, BotStatus.IDLE);
            this.#storage.updateBotOrder(index, undefined);
            this.#storage.updateBotTimeoutId(index, undefined);

            this.#fileLogger.log(
              `Bot #${index + 1} completed ${order.type} Order #${
                order.id
              } - Status: COMPLETE`
            );
            this.#fileLogger.log(`Bot #${index + 1} is now IDLE`);

            this.execute();
          }, this.#botProcessingTimeInMillis)
        );

        this.#fileLogger.log(
          `Bot #${index + 1} picked up ${order.type} Order #${
            order.id
          } - Status: PROCESSING`
        );
      }
    });

    const pendingOrderArray = this.#storage.getPendingOrderArray();
    if (pendingOrderArray.length === 0) {
      this.#fileLogger.log(`No pending orders`);
    }
  }
}

export default ProcessOrders;
