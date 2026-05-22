import { Bot, BotStatus } from '../models/bot.model';
import { OrderService } from './order.service';

type BotEventCallback = (event: string, data: any) => void;

export class BotService {
  private bots: Bot[] = [];
  private botCounter: number = 0;
  private processingTimers: Map<number, NodeJS.Timeout> = new Map();
  private eventCallback?: BotEventCallback;

  constructor(private orderService: OrderService) {}

  setEventCallback(callback: BotEventCallback): void {
    this.eventCallback = callback;
  }

  private emitEvent(event: string, data: any): void {
    if (this.eventCallback) {
      this.eventCallback(event, data);
    }
  }

  addBot(): Bot {
    const bot: Bot = {
      id: ++this.botCounter,
      status: 'IDLE',
      createdAt: new Date()
    };

    this.bots.push(bot);
    this.emitEvent('bot:created', { bot });

    // Immediately start processing if there are pending orders
    this.processBotLoop(bot);

    return bot;
  }

  removeBot(): Bot | undefined {
    if (this.bots.length === 0) {
      return undefined;
    }

    // Remove the newest bot (last in array)
    const bot = this.bots.pop();

    if (bot) {
      // Clear any processing timer
      const timer = this.processingTimers.get(bot.id);
      if (timer) {
        clearTimeout(timer);
        this.processingTimers.delete(bot.id);
      }

      // If bot was processing an order, return it to pending
      if (bot.currentOrderId) {
        this.orderService.returnOrderToPending(bot.currentOrderId);
        this.emitEvent('order:returned', { orderId: bot.currentOrderId, botId: bot.id });
      }

      this.emitEvent('bot:removed', { bot });
    }

    return bot;
  }

  private async processBotLoop(bot: Bot): Promise<void> {
    // Check if bot still exists (might have been removed)
    if (!this.bots.find(b => b.id === bot.id)) {
      return;
    }

    // Get next pending order (automatically removes from queue)
    const order = this.orderService.getNextPendingOrder();

    if (!order) {
      // No orders available, bot becomes idle
      bot.status = 'IDLE';
      bot.currentOrderId = undefined;
      this.emitEvent('bot:idle', { bot });

      // Check again after a short delay
      setTimeout(() => this.processBotLoop(bot), 1000);
      return;
    }

    // Mark order as processing
    bot.status = 'PROCESSING';
    bot.currentOrderId = order.id;
    order.status = 'PROCESSING';
    order.processingStartedAt = new Date();
    order.botId = bot.id;

    // Add to processing orders array (since it was removed from pending queue)
    this.orderService.addToProcessing(order);

    this.emitEvent('order:processing', { order, bot });

    // Process order for 10 seconds
    const timer = setTimeout(() => {
      this.processingTimers.delete(bot.id);

      // Check if bot still exists
      if (!this.bots.find(b => b.id === bot.id)) {
        return;
      }

      // Mark order as complete
      this.orderService.markOrderAsComplete(order.id);
      this.emitEvent('order:completed', { order, bot });

      // Reset bot and continue processing
      bot.status = 'IDLE';
      bot.currentOrderId = undefined;

      // Continue processing loop
      this.processBotLoop(bot);
    }, 10000); // 10 seconds

    this.processingTimers.set(bot.id, timer);
  }

  getBots(): Bot[] {
    return [...this.bots];
  }

  getBot(id: number): Bot | undefined {
    return this.bots.find(b => b.id === id);
  }

  getBotCount(): number {
    return this.bots.length;
  }

  getActiveBotCount(): number {
    return this.bots.filter(b => b.status === 'PROCESSING').length;
  }

  getIdleBotCount(): number {
    return this.bots.filter(b => b.status === 'IDLE').length;
  }
}
