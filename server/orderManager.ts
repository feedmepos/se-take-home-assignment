import { Order, OrderType, OrderStatus, SystemState, Bot } from './types.js';
import { logger } from './utils/logger.js';

export class OrderManager {
  private state: SystemState = {
    orders: [],
    bots: [],
    nextOrderId: 1,
    nextBotId: 1,
  };

  private processingIntervals: Map<number, NodeJS.Timeout> = new Map();

  createOrder(type: OrderType): Order {
    const order: Order = {
      id: this.state.nextOrderId++,
      type,
      status: 'PENDING',
      createdAt: new Date(),
    };
    this.state.orders.push(order);
    logger.logOrderCreated(order.id, type);
    this.processNextOrder();
    return order;
  }

  createBot(): Bot {
    const bot: Bot = {
      id: this.state.nextBotId++,
      status: 'IDLE',
    };
    this.state.bots.push(bot);
    logger.logBotCreated(bot.id);
    this.processNextOrder();
    return bot;
  }

  removeBot(): Bot | null {
    if (this.state.bots.length === 0) return null;

    const bot = this.state.bots.pop()!;

    // Stop processing if bot is active
    if (bot.currentOrderId !== undefined) {
      const interval = this.processingIntervals.get(bot.id);
      if (interval) {
        clearInterval(interval);
        this.processingIntervals.delete(bot.id);
      }

      // Return order to pending
      const order = this.state.orders.find((o) => o.id === bot.currentOrderId);
      if (order) {
        order.status = 'PENDING';
      }
    }

    logger.logBotRemoved(bot.id);
    return bot;
  }

  private processNextOrder(): void {
    const idleBot = this.state.bots.find((b) => b.status === 'IDLE');
    if (!idleBot) return;

    const nextOrder = this.getNextPendingOrder();
    if (!nextOrder) return;

    idleBot.status = 'PROCESSING';
    idleBot.currentOrderId = nextOrder.id;
    idleBot.processingStartTime = new Date();
    nextOrder.status = 'PROCESSING';

    const interval = setInterval(() => {
      this.completeOrder(idleBot.id, nextOrder.id);
      clearInterval(interval);
      this.processingIntervals.delete(idleBot.id);
    }, 10000); // 10 seconds

    this.processingIntervals.set(idleBot.id, interval);
  }

  private completeOrder(botId: number, orderId: number): void {
    const order = this.state.orders.find((o) => o.id === orderId);
    if (order) {
      order.status = 'COMPLETE';
      order.completedAt = new Date();
      logger.logOrderCompleted(order.id);
    }

    const bot = this.state.bots.find((b) => b.id === botId);
    if (bot) {
      bot.status = 'IDLE';
      bot.currentOrderId = undefined;
      bot.processingStartTime = undefined;
      this.processNextOrder();
    }
  }

  private getNextPendingOrder(): Order | undefined {
    // VIP orders first, then normal orders
    const vipOrder = this.state.orders.find(
      (o) => o.status === 'PENDING' && o.type === 'VIP'
    );
    if (vipOrder) return vipOrder;

    return this.state.orders.find(
      (o) => o.status === 'PENDING' && o.type === 'NORMAL'
    );
  }

  getState() {
    return {
      orders: this.state.orders,
      bots: this.state.bots,
    };
  }

  clearAll(): void {
    this.processingIntervals.forEach((interval) => clearInterval(interval));
    this.processingIntervals.clear();
    this.state = {
      orders: [],
      bots: [],
      nextOrderId: 1,
      nextBotId: 1,
    };
    logger.logSystemReset();
  }
}
