import { EventEmitter } from 'node:events';
import { Order } from '../order/order.model.js';
import { Bot } from '../bot/bot.model.js';
import { OrderQueueService } from '../order/order-queue.service.js';
import { BotService } from '../bot/bot.service.js';

export class BotManagerService extends EventEmitter {
  private orderQueue = new OrderQueueService();
  private botService = new BotService();
  private bots: Bot[] = [];
  private completedOrders: Order[] = [];

  addNormalOrder(): Order {
    const order = this.orderQueue.addOrder('normal');
    this.emit('order:pending', { order });
    this.processNext();
    return order;
  }

  addVipOrder(): Order {
    const order = this.orderQueue.addOrder('vip');
    this.emit('order:pending', { order });
    this.processNext();
    return order;
  }

  addBot(): Bot {
    const bot = this.botService.createBot();
    this.bots.push(bot);
    this.emit('bot:added', { bot });
    this.processNext();
    return bot;
  }

  removeBot(): Bot | null {
    if (this.bots.length === 0) return null;

    const bot = this.bots.pop()!;
    const returnedOrder = this.botService.stopProcessing(bot);

    if (returnedOrder) {
      this.orderQueue.returnOrder(returnedOrder);
    }

    this.emit('bot:removed', { bot, returnedOrder });
    this.processNext();
    return bot;
  }

  getPendingOrders(): Order[] {
    return this.orderQueue.pending();
  }

  getCompletedOrders(): Order[] {
    return [...this.completedOrders];
  }

  getBots(): Bot[] {
    return [...this.bots];
  }

  private processNext(): void {
    for (const bot of this.bots) {
      if (bot.status !== 'idle') continue;
      if (this.orderQueue.isEmpty()) break;

      const order = this.orderQueue.nextOrder()!;
      this.emit('order:processing', { order, bot });

      this.botService.startProcessing(bot, order, () => {
        order.status = 'complete';
        bot.status = 'idle';
        bot.currentOrder = null;
        bot.timer = null;
        this.completedOrders.push(order);
        this.emit('order:complete', { order, bot });
        this.processNext();
      });
    }
  }
}
