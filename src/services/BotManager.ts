import { Order } from '../models/Order';
import { OrderQueue } from './OrderQueue';
import { ILogger } from './Logger';

interface Bot {
  id: number;
  currentOrder: Order | null;
  elapsedMs: number;
  interval: NodeJS.Timeout | null;
}

export class BotManager {
  private bots: Bot[] = [];
  private nextBotId = 1;

  constructor(
    private queue: OrderQueue,
    private logger: ILogger,
    private processingTimeMs: number = parseInt(process.env.PROCESSING_TIME_MS ?? '10000'),
    private tickMs: number = 1000,
  ) {}

  addBot(): void {
    const bot: Bot = { id: this.nextBotId++, currentOrder: null, elapsedMs: 0, interval: null };
    this.bots.push(bot);
    this.logger.log(`Bot #${bot.id} created - Status: ACTIVE`);
    this.tryAssignNext(bot);
  }

  removeBot(): void {
    if (this.bots.length === 0) {
      console.log('No bots to remove.');
      return;
    }
    const bot = this.bots.pop()!;
    if (bot.interval) clearInterval(bot.interval);

    if (bot.currentOrder) {
      bot.currentOrder.status = 'PENDING';
      this.queue.enqueue(bot.currentOrder);
      this.logger.log(`Bot #${bot.id} destroyed - Order #${bot.currentOrder.id} returned to queue`);
    } else {
      this.logger.log(`Bot #${bot.id} destroyed while IDLE`);
    }
  }

  tryAssignToIdleBots(): void {
    for (const bot of this.bots) {
      if (!bot.currentOrder && this.queue.size() > 0) {
        this.tryAssignNext(bot);
      }
    }
  }

  getStatus(): string {
    if (this.bots.length === 0) return 'No bots active.';
    const lines = this.bots.map(bot => {
      if (bot.currentOrder) {
        const remainingSecs = Math.ceil((this.processingTimeMs - bot.elapsedMs) / 1000);
        return `Bot #${bot.id} - Processing Order #${bot.currentOrder.id} (${remainingSecs}s left)`;
      }
      return `Bot #${bot.id} - IDLE`;
    });
    return `Total Bots: ${this.bots.length}\n` + lines.join('\n');
  }

  getBotCount(): number {
    return this.bots.length;
  }

  drainAll(): void {
    while (this.bots.length > 0) {
      this.removeBot();
    }
  }

  private tryAssignNext(bot: Bot): void {
    const order = this.queue.dequeue();
    if (!order) return;
    this.startProcessing(bot, order);
  }

  private startProcessing(bot: Bot, order: Order): void {
    order.status = 'PROCESSING';
    bot.currentOrder = order;
    bot.elapsedMs = 0;
    const label = order.isVip ? 'VIP' : 'Normal';
    this.logger.log(`Bot #${bot.id} picked up ${label} Order #${order.id} - Status: PROCESSING`);

    bot.interval = setInterval(() => {
      bot.elapsedMs += this.tickMs;
      if (bot.elapsedMs >= this.processingTimeMs) {
        clearInterval(bot.interval!);
        bot.interval = null;
        order.status = 'COMPLETE';
        bot.currentOrder = null;
        this.logger.log(
          `Bot #${bot.id} completed ${label} Order #${order.id} - Status: COMPLETE (Processing time: ${this.processingTimeMs / 1000}s)`
        );
        const next = this.queue.dequeue();
        if (next) {
          this.startProcessing(bot, next);
        } else {
          this.logger.log(`Bot #${bot.id} is now IDLE - No pending orders`);
        }
      }
    }, this.tickMs);
  }
}
