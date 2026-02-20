import { Bot } from "../models/bot";
import { OrderQueue } from "./order-queue";
import { log } from "../utils/logger";
import { LogType } from "../types";

const { BOT_CREATE, BOT_IDLE, BOT_DESTROY } = LogType;

export class BotManager {
  private bots: Bot[] = [];
  private lastBotId: number = 1;

  static activeBotCount: number = 0;
  static removeBotCount: number = 0;

  constructor(private queue: OrderQueue) {}

  addBot(): Bot {
    const nextBotId: number = this.lastBotId++;
    const onComplete = (): void => this.assignAndProcessOrder(newBot);

    const newBot = new Bot(nextBotId, onComplete);

    BotManager.activeBotCount++;
    this.bots.push(newBot);

    log(BOT_CREATE, { bot_id: newBot.id });

    onComplete();

    return newBot;
  }

  removeBot(): Bot | null {
    if (this.bots.length === 0) return null;

    const bot = this.bots.pop()!;
    const order = bot.stop();

    if (order) {
      this.queue.requeue(order);
    }

    BotManager.activeBotCount--;
    BotManager.removeBotCount++;

    log(BOT_DESTROY, { bot_id: bot.id });

    return bot;
  }

  assignAndProcessOrder(checkBot?: Bot): void {
    // iterate through all bots and assign and process orders
    for (const bot of this.bots) {
      // find an idle bot
      if (bot.isIdle) {
        // get next pending order
        const pendingOrder = this.queue.next();

        // if has next pending order, process it (10 seconds)
        if (pendingOrder) {
          bot.process(pendingOrder);
        }
      }
    }

    if (checkBot && checkBot.isIdle) {
      log(BOT_IDLE, { bot_id: checkBot.id });
    }
  }
}
