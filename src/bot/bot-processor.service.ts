import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { LoggerService } from 'src/logger/logger.service';
import { Order } from 'src/order/entities/order.entity';
import { OrderStatus } from 'src/order/enums/order-status.enum';
import { OrderService } from 'src/order/order.service';
import { QueueService } from 'src/queue/queue.service';
import { BotService } from './bot.service';
import { BotStatus } from './enums/bot-status.enum';

interface BotOrder {
  order: Order;
  startTime: Date;
  timeout: NodeJS.Timeout;
}

@Injectable()
export class BotProcessorService implements OnModuleDestroy {
  private botOrderMap: Map<number, BotOrder> = new Map();

  constructor(
    private readonly queueService: QueueService,
    private readonly orderService: OrderService,
    private readonly botService: BotService,
    private readonly logger: LoggerService,
  ) {}

  onModuleDestroy() {
    const allBots = this.botService.getAll();

    allBots.forEach((bot) => {
      this.unsubscribeBot(bot.id);
    });

    allBots.forEach((bot) => {
      this.stopProcessing(bot.id);
    });
  }

  subscribeBot(botId: number): void {
    const callback = () => this.tryProcessOrder(botId);

    this.botService.onQueueSubscribed(botId, callback);
    this.queueService.subscribe(callback);

    this.tryProcessOrder(botId);
  }

  unsubscribeBot(botId: number): void {
    const bot = this.botService.getById(botId);
    if (!bot?.callback) return;

    this.queueService.unsubscribe(bot.callback);
    this.botService.onQueueUnsubscribed(botId);
  }

  private tryProcessOrder(botId: number): boolean {
    const isIdle = this.botService.isIdle(botId);
    if (!isIdle) return false;

    const order = this.queueService.dequeue();
    if (!order) {
      this.logger.logWithTimestamp(
        `Bot #${botId} is now ${BotStatus.IDLE} - No pending orders`,
      );
      return false;
    }

    this.botService.onOrderReceived(botId, order.id);
    this.orderService.startProcessing(order.id, botId);

    this.logger.logWithTimestamp(
      `Bot #${botId} picked up ${order.type} Order #${order.id} - Status: ${OrderStatus.PROCESSING}`,
    );

    const startTime = new Date();
    const timeout = setTimeout(() => {
      this.completeProcessing(botId);
    }, 10000);

    this.botOrderMap.set(botId, {
      order,
      timeout,
      startTime,
    });

    return true;
  }

  stopProcessing(botId: number): void {
    const botOrder = this.botOrderMap.get(botId);
    if (!botOrder) return;

    clearTimeout(botOrder.timeout);
    this.botOrderMap.delete(botId);

    const orderId = botOrder.order.id;
    const order = this.orderService.returnToPending(orderId)!;

    this.queueService.returnToQueue(order);
    this.botService.onOrderCancelled(botId);
  }

  private completeProcessing(botId: number): void {
    const botOrder = this.botOrderMap.get(botId)!;
    const order = botOrder.order;
    this.orderService.completeOrder(order.id);
    this.botService.onOrderCompleted(botId);
    const now = new Date();
    const processingTime = Math.floor(
      (now.getTime() - botOrder.startTime.getTime()) / 1000,
    );
    this.logger.logWithTimestamp(
      `Bot #${botId} completed ${order.type} Order #${order.id} - Status: ${OrderStatus.COMPLETE} (Processing time: ${processingTime}s)`,
    );

    this.botOrderMap.delete(botId);
    this.tryProcessOrder(botId);
  }
}
