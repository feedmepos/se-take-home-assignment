import { Order, OrderType } from './types';
import { Bot } from './Bot';
import { OrderQueue } from './OrderQueue';

export class OrderController {
  private readonly queue = new OrderQueue();
  private readonly bots: Bot[] = [];
  private readonly completedOrders: Order[] = [];
  private nextBotId = 1;
  private readonly onLog: (message: string) => void;
  private readonly processingTimeMs: number;

  constructor(onLog: (message: string) => void = console.log, processingTimeMs = 10_000) {
    this.onLog = onLog;
    this.processingTimeMs = processingTimeMs;
  }

  addOrder(type: OrderType): Order {
    const order = this.queue.enqueue(type);
    this.onLog(`Created ${type} Order #${order.id} - Status: PENDING`);
    this.assignPendingOrders();
    return order;
  }

  addBot(): void {
    const bot = new Bot(this.nextBotId++, this.processingTimeMs, this.handleBotComplete.bind(this));
    this.bots.push(bot);
    this.onLog(`Bot #${bot.id} created - Status: ACTIVE`);
    this.assignPendingOrders();
  }

  removeBot(): void {
    if (this.bots.length === 0) return;

    // Remove the newest bot (last in array)
    const bot = this.bots.pop()!;
    const order = bot.stop();

    if (order) {
      this.onLog(`Bot #${bot.id} destroyed - Order #${order.id} returned to PENDING`);
      this.queue.requeue(order);
    } else {
      this.onLog(`Bot #${bot.id} destroyed while IDLE`);
    }
  }

  waitForCompletion(): Promise<void> {
    return new Promise(resolve => {
      const check = () => {
        const allIdle = this.bots.every(b => b.isIdle);
        if (allIdle && this.queue.size === 0) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      setTimeout(check, 100);
    });
  }

  getStatus() {
    return {
      pendingOrders: this.queue.getAll(),
      completedOrders: this.completedOrders,
      bots: this.bots.map(b => ({
        id: b.id,
        status: b.isIdle ? 'IDLE' : 'PROCESSING',
        currentOrderId: b.processingOrder?.id,
      })),
    };
  }

  private handleBotComplete(bot: Bot, order: Order): void {
    this.completedOrders.push(order);
    this.onLog(
      `Bot #${bot.id} completed ${order.type} Order #${order.id} - Status: COMPLETE (Processing time: ${this.processingTimeMs / 1000}s)`
    );

    const next = this.queue.dequeue();
    if (next) {
      bot.startProcessing(next);
      this.onLog(`Bot #${bot.id} picked up ${next.type} Order #${next.id} - Status: PROCESSING`);
    } else {
      this.onLog(`Bot #${bot.id} is now IDLE - No pending orders`);
    }
  }

  private assignPendingOrders(): void {
    for (const bot of this.bots) {
      if (bot.isIdle && this.queue.size > 0) {
        const order = this.queue.dequeue()!;
        bot.startProcessing(order);
        this.onLog(`Bot #${bot.id} picked up ${order.type} Order #${order.id} - Status: PROCESSING`);
      }
    }
  }
}
