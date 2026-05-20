import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { OrderService } from '../order/order.service';
import { Bot, BotStatus } from './bot.types';
import { Order } from '../order/order.types';

type OrderCompletedCb = (botId: number, order: Order) => void;
type BotIdleCb = (botId: number) => void;

@Injectable()
export class BotService implements OnModuleDestroy {
  private bots: Map<number, Bot> = new Map();
  private nextBotId = 1;
  private timers: Map<number, ReturnType<typeof setTimeout>> = new Map();
  private onOrderCompleted?: OrderCompletedCb;
  private onBotIdle?: BotIdleCb;

  constructor(private readonly orderService: OrderService) {}

  setCallbacks(onOrderCompleted?: OrderCompletedCb, onBotIdle?: BotIdleCb): void {
    this.onOrderCompleted = onOrderCompleted;
    this.onBotIdle = onBotIdle;
  }

  addBot(): Bot {
    const bot: Bot = {
      id: this.nextBotId++,
      status: BotStatus.IDLE,
      currentOrder: null,
    };
    this.bots.set(bot.id, bot);
    this.tryProcessNext(bot.id);
    return bot;
  }

  removeLatestBot(): Bot | null {
    if (this.bots.size === 0) return null;
    
    const newestId = Math.max(...this.bots.keys());
    const bot = this.bots.get(newestId)!;

    const timer = this.timers.get(newestId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(newestId);
    }

    const returnedOrder = bot.currentOrder;
    if (returnedOrder) {
      this.orderService.returnOrderToPending(returnedOrder);
      bot.currentOrder = null;
    }

    this.bots.delete(newestId);
    return { ...bot, currentOrder: returnedOrder };
  }

  notifyNewOrder(): void {
    for (const [botId, bot] of this.bots) {
      if (bot.status === BotStatus.IDLE) {
        this.tryProcessNext(botId);
        return;
      }
    }
  }

  private tryProcessNext(botId: number): void {
    const bot = this.bots.get(botId);
    if (!bot) return;

    const order = this.orderService.getNextPendingOrder();
    if (!order) {
      bot.status = BotStatus.IDLE;
      this.onBotIdle?.(botId);
      return;
    }

    bot.status = BotStatus.PROCESSING;
    bot.currentOrder = order;

    const timer = setTimeout(() => {
      this.timers.delete(botId);
      const currentBot = this.bots.get(botId);
      if (!currentBot) return;

      this.orderService.completeOrder(order);
      currentBot.currentOrder = null;
      currentBot.status = BotStatus.IDLE;

      this.onOrderCompleted?.(botId, order);
      this.tryProcessNext(botId);
    }, 10000);

    this.timers.set(botId, timer);
  }

  getBots(): Bot[] {
    return [...this.bots.values()];
  }

  getBotCount(): number {
    return this.bots.size;
  }

  onModuleDestroy(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
  }
}
