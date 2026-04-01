import { Bot } from './bot.model.js';
import { Order } from '../order/order.model.js';
import { PROCESSING_TIME_MS } from '../constants.js';

export class BotService {
  private nextBotId = 1;

  createBot(): Bot {
    return {
      id: this.nextBotId++,
      status: 'idle',
      currentOrder: null,
      timer: null,
    };
  }

  startProcessing(bot: Bot, order: Order, onComplete: () => void): void {
    bot.status = 'processing';
    bot.currentOrder = order;
    order.status = 'processing';

    bot.timer = setTimeout(() => {
      onComplete();
    }, PROCESSING_TIME_MS);
  }

  stopProcessing(bot: Bot): Order | null {
    if (bot.status === 'idle' || !bot.currentOrder) {
      return null;
    }

    clearTimeout(bot.timer!);
    const order = bot.currentOrder;

    bot.status = 'idle';
    bot.currentOrder = null;
    bot.timer = null;

    return order;
  }
}
