import { OrderType, BotStatus } from '../model/types';
import { Order } from '../model/Order';
import { Bot } from '../model/Bot';
import { OrderProcessingEvents, OrderEvent } from '../event/OrderProcessingEvents';

const PROCESSING_TIME_MS = 10_000;

export class OrderProcessingEngine {
  private orders: Order[] = [];
  private bots: Bot[] = [];
  private nextOrderId = 1;
  private nextBotId = 1;
  private events = new OrderProcessingEvents();

  createOrder(type: OrderType): Order {
    const order = new Order(this.nextOrderId++, type);
    if (type === 'VIP') {
      const lastVipIndex = this.findLastVipIndex();
      this.orders.splice(lastVipIndex + 1, 0, order);
    } else {
      this.orders.push(order);
    }
    this.dispatchProcessing();
    return order;
  }

  getOrders(): Order[] {
    return [...this.orders];
  }

  addBot(): Bot {
    const bot = new Bot(this.nextBotId++);
    this.bots.push(bot);
    this.tryProcessNext(bot);
    return bot;
  }

  removeBot(): void {
    if (this.bots.length === 0) return;
    const bot = this.bots.pop()!;

    if (bot.isProcessing() && bot.currentOrderId !== undefined) {
      if (bot.timerId) clearTimeout(bot.timerId);
      const order = this.orders.find((o) => o.id === bot.currentOrderId);
      if (order) {
        order.returnToPending();
      }
    }

    this.dispatchProcessing();
  }

  getBots(): Bot[] {
    return [...this.bots];
  }

  addListener(event: string, fn: (payload: unknown) => void): void {
    this.events.on(event as OrderEvent, fn);
  }

  private findLastVipIndex(): number {
    let index = -1;
    for (let i = this.orders.length - 1; i >= 0; i--) {
      if (this.orders[i].type === 'VIP') {
        index = i;
        break;
      }
    }
    return index;
  }

  private dispatchProcessing(): void {
    for (const bot of this.bots) {
      if (bot.isIdle()) {
        this.tryProcessNext(bot);
      }
    }
  }

  private tryProcessNext(bot: Bot): void {
    const order = this.orders.find((o) => o.status === 'PENDING');
    if (!order) {
      if (bot.isProcessing()) {
        bot.release();
        this.events.emit('bot:status_changed', {
          botId: bot.id,
          status: 'IDLE' as BotStatus,
        });
      }
      return;
    }

    order.startProcessing();
    bot.assignOrder(order.id);
    this.events.emit('bot:status_changed', {
      botId: bot.id,
      status: 'PROCESSING' as BotStatus,
      currentOrderId: order.id,
    });

    bot.timerId = setTimeout(() => {
      order.complete();
      bot.release();

      this.events.emit('order:completed', order.toJSON());
      this.events.emit('bot:status_changed', {
        botId: bot.id,
        status: 'IDLE' as BotStatus,
      });

      this.tryProcessNext(bot);
    }, PROCESSING_TIME_MS);
  }
}
