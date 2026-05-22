import { OrderQueue } from "../lib/queue/orderQueue";
import logger from "../lib/util/logger";
import { Bot } from "./bot";
import { BotEventHandler } from "./type";

export class BotManager {
  // Set 10 seconds for processing
  public static PROCESS_TIME_MS = 10000;

  private queue: OrderQueue;
  private bots: Bot[] = [];
  private counter = 0;
  private onComplete: BotEventHandler;

  constructor(queue: OrderQueue, onComplete: BotEventHandler) {
    this.queue = queue;
    this.onComplete = onComplete;
  }

  addBot() {
    const id = this.counter + 1;
    this.counter += 1;
    const bot = new Bot(
      id,
      this.queue,
      BotManager.PROCESS_TIME_MS,
      this.onComplete
    );
    this.bots.push(bot);
    logger.info(`Bot added -> Bot#${id}`);
    bot.startProcessing();
    return bot;
  }

  removeBot() {
    if (this.bots.length === 0) {
      return null;
    }
    const bot = this.bots.pop()!;
    const returned = bot.stopAndReturnOrder();
    if (returned) {
      this.queue.enqueueFront(returned);
    }
    logger.info(`Bot removed -> Bot#${bot.id}`);
    return bot;
  }

  activeCount() {
    return this.bots.length;
  }
}
