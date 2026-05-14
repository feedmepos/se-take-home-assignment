import { Order, OrderType, OrderStatus, SystemState, Bot } from './types.js';
import { logger } from './utils/logger.js';

// Processing time in milliseconds (10 seconds for demo)
const PROCESSING_TIME_MS = 10000;

type StateChangeCallback = (state: { orders: Order[]; bots: Bot[] }) => void;

export class OrderManager {
  private state: SystemState = {
    orders: [],
    bots: [],
    nextOrderId: 1,
    nextBotId: 1,
  };

  private processingIntervals: Map<number, NodeJS.Timeout> = new Map();
  private onStateChange: StateChangeCallback | null = null;

  setStateChangeCallback(callback: StateChangeCallback): void {
    this.onStateChange = callback;
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange({
        orders: this.state.orders,
        bots: this.state.bots,
      });
    }
  }

  createOrder(type: OrderType): Order {
    const order: Order = {
      id: this.state.nextOrderId++,
      type,
      status: 'PENDING',
      createdAt: new Date(),
    };
    this.state.orders.push(order);
    logger.logOrderCreated(order.id, type);
    this.notifyStateChange();
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
    this.notifyStateChange();
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

    logger.logBotRemoved(bot.id, bot.status);
    this.notifyStateChange();
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

    // Log bot picking up order
    logger.logBotPickedUpOrder(idleBot.id, nextOrder.id, nextOrder.type);
    this.notifyStateChange();

    const interval = setInterval(() => {
      this.completeOrder(idleBot.id, nextOrder.id);
      clearInterval(interval);
      this.processingIntervals.delete(idleBot.id);
    }, PROCESSING_TIME_MS);

    this.processingIntervals.set(idleBot.id, interval);
  }

  private completeOrder(botId: number, orderId: number): void {
    const order = this.state.orders.find((o) => o.id === orderId);
    if (order) {
      order.status = 'COMPLETE';
      order.completedAt = new Date();
      
      // Calculate processing time
      // const processingTime = order.completedAt && order.createdAt 
      //   ? Math.round((order.completedAt.getTime() - order.createdAt.getTime()) / 1000)
      //   : 0;
      
      logger.logOrderCompleted(order.id, 10);
    }

    const bot = this.state.bots.find((b) => b.id === botId);
    if (bot) {
      bot.status = 'IDLE';
      bot.currentOrderId = undefined;
      bot.processingStartTime = undefined;
      logger.logBotIdle(bot.id);
      this.notifyStateChange();
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
    this.notifyStateChange();
  }
}
