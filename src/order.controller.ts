import { OrderService } from './order.service';
import { CookingBotService } from './bot.service';
import { LogCallback, Order, OrderStats, OrderType } from './types';

export class OrderController {
  private queue: OrderService = new OrderService();
  private bots: CookingBotService[] = [];
  private orders: Map<number, Order> = new Map();
  private orderId: number = 1001;
  private botId: number = 1;
  private log: LogCallback;

  constructor(log: LogCallback) {
    this.log = log;
  }

  getTimestamp(): string {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `[${hh}:${mm}:${ss}]`;
  }

  createOrder(type: OrderType): Order {
    const order: Order = {
      id: this.orderId++,
      type,
      status: 'PENDING',
      createdAt: new Date(),
    };
    this.orders.set(order.id, order);
    this.queue.enqueue(order);
    this.log(`${this.getTimestamp()} Created ${order.type} Order #${order.id} - Status: PENDING`);

    // Trigger any idle bots to pick up the new order
    for (const bot of this.bots) {
      if (bot.status === 'IDLE') {
        const pickedUp = this.tryPickupPendingOrder(bot);
        if (pickedUp) {
          bot.processOrder(bot.currentOrder!).then(() => this.onOrderCompleted(bot));
          break;
        }
      }
    }

    return order;
  }

  private tryPickupPendingOrder(bot: CookingBotService): boolean {
    const order = this.queue.peek();
    if (!order) {
      return false;
    }

    // Dequeue and assign the order
    this.queue.dequeue();
    order.status = 'PROCESSING';
    order.startedAt = new Date();
    bot.status = 'PROCESSING';
    bot.currentOrder = order;

    this.log(`${this.getTimestamp()} Bot #${bot.id} picked up ${order.type} Order #${order.id} - Status: PROCESSING`);
    return true;
  }

  private startProcessing(bot: CookingBotService): boolean {
    if (this.tryPickupPendingOrder(bot)) {
      bot.processOrder(bot.currentOrder!).then(() => this.onOrderCompleted(bot));
      return true;
    }
    this.log(`${this.getTimestamp()} Bot #${bot.id} is now IDLE - No pending orders`);
    return false;
  }

  private onOrderCompleted(bot: CookingBotService): void {
    const order = bot.currentOrder;
    if (!order) {
      // Bot was stopped mid-processing
      return;
    }

    order.status = 'COMPLETE';
    order.completedAt = new Date();
    bot.completeProcessing();

    const processingTime = Math.round((order.completedAt!.getTime() - order.startedAt!.getTime()) / 1000);
    this.log(`${this.getTimestamp()} Bot #${bot.id} completed ${order.type} Order #${order.id} - Status: COMPLETE (Processing time: ${processingTime}s)`);

    // Try to process next order
    this.startProcessing(bot);
  }

  addBot(): void {
    const bot = new CookingBotService(this.botId++);
    this.bots.push(bot);
    this.log(`${this.getTimestamp()} Bot #${bot.id} created - Status: ACTIVE`);

    // Immediately try to start processing if there are pending orders
    this.startProcessing(bot);
  }

  removeBot(): void {
    if (this.bots.length === 0) {
      this.log(`${this.getTimestamp()} No bot is available to remove`);
      return;
    }

    // Remove the newest bot
    const bot = this.bots.pop()!;

    if (bot.status === 'PROCESSING' && bot.currentOrder) {
      // Retrieve the order first before stopping processing
      const order = bot.currentOrder;
      bot.stopProcessing();
      order.status = 'PENDING';
      this.queue.requeueOrder(order);
      this.log(`${this.getTimestamp()} Bot #${bot.id} destroyed while processing Order #${order.id}`);

      // Hand off to an idle bot if one exists
      for (const remainingBot of this.bots) {
        if (remainingBot.status === 'IDLE') {
          this.startProcessing(remainingBot);
          break;
        }
      }
    } else {
      this.log(`${this.getTimestamp()} Bot #${bot.id} destroyed while IDLE`);
    }
  }

  getStatus(): OrderStats {
    let vipOrders = 0;
    let normalOrders = 0;
    let completedOrders = 0;

    for (const order of this.orders.values()) {
      if (order.type === 'VIP') vipOrders++;
      else normalOrders++;
      if (order.status === 'COMPLETE') completedOrders++;
    }

    return {
      totalOrders: this.orders.size,
      vipOrders,
      normalOrders,
      completedOrders,
      pendingOrders: this.queue.size(),
      activeBots: this.bots.length,
    };
  }

  getPendingOrders(): Order[] {
    return this.queue.getAll();
  }

  getBots(): CookingBotService[] {
    return this.bots;
  }
}
