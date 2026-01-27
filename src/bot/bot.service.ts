import { Injectable } from '@nestjs/common';
import { Bot, BotSummary, PROCESSING_TIME_MS } from '../bot/bot.types';
import { OrderService } from '../order/order.service';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class BotService {
  private nextBotId = 1;
  private readonly bots: Bot[] = [];

  constructor(
    private readonly orders: OrderService,
    private readonly logger: LoggerService,
  ) { }

  addBot(): Bot {
    const bot: Bot = {
      id: this.nextBotId++,
      isIdle: true,
    };
    this.bots.push(bot);
    this.logger.log(`Bot #${bot.id} created - Status: ACTIVE`);
    this.tryStartWork(bot);
    return bot;
  }

  removeBot(): Bot | undefined {
    if (this.bots.length === 0) {
      this.logger.log('No bots to destroy');
      return undefined;
    }

    const bot = this.bots.pop()!;
    this.logger.log(`Bot #${bot.id} destroyed ${bot.currentOrder ? `while processing order #${bot.currentOrder.id}`:`while IDLE`}`);

    if (bot.timer) {
      clearTimeout(bot.timer);
      bot.timer = undefined;
    }

    if (bot.currentOrder) {
      const order = bot.currentOrder;
      bot.currentOrder = undefined;
      this.logger.log(
        `Bot #${bot.id} stopped processing order #${order.id} returning order to PENDING`,
      );
      this.orders.returnToPending(order);
    }

    return bot;
  }

  /**
   * Starts work on the next pending order if any; otherwise stays IDLE.
   */
  private tryStartWork(bot: Bot): void {
    if (bot.currentOrder) {
      return;
    }

    const next = this.orders.getNextPendingOrder();
    if (!next) {
      bot.isIdle = true;
      this.logger.log(`Bot #${bot.id} is now IDLE - No pending orders`);
      return;
    }

    bot.currentOrder = next;
    bot.isIdle = false;
    this.logger.log(
      `Bot #${bot.id} picked up ${next.type} Order #${next.id} - Status: PROCESSING`,
    );

    bot.timer = setTimeout(() => {
      this.orders.completeOrder(bot.id, next);
      bot.currentOrder = undefined;
      bot.timer = undefined;
      this.tryStartWork(bot);
    }, PROCESSING_TIME_MS);
  }

  /**
   * Called when a new order comes in, to wake up idle bots.
   */
  onNewOrder(): void {
    for (const bot of this.bots) {
      if (!bot.currentOrder) {
        this.tryStartWork(bot);
      }
    }
  }

  hasActiveWork(): boolean {
    return (
      this.orders.hasPendingOrders() ||
      this.bots.some((bot) => !bot.isIdle || !!bot.currentOrder)
    );
  }

  getSummary(): BotSummary {
    const orderSummary = this.orders.getSummary();

    return {
      total: orderSummary.totalProcessed,
      vip: orderSummary.vipCompleted,
      normal: orderSummary.normalCompleted,
      completed: orderSummary.totalProcessed,
      pending: orderSummary.pending,
      activeBots: this.bots.length,
    };
  }
}

