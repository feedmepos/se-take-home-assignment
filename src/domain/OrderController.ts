import type {
  Bot,
  Order,
  OrderControllerSnapshot,
  OrderType,
  Scheduler,
  SchedulerHandle,
} from "./types.js";
import type { Logger } from "./logger.js";

export const realScheduler: Scheduler = {
  schedule(callback, ms) {
    const id = setTimeout(callback, ms);
    const handle: SchedulerHandle = {
      clear() {
        clearTimeout(id);
      },
    };
    return handle;
  },
};

const PROCESSING_TIME_MS = 10_000;
const FIRST_ORDER_ID = 1001;
const FIRST_BOT_ID = 1;

export interface OrderControllerOptions {
  logger: Logger;
  scheduler?: Scheduler;
  firstOrderId?: number;
  firstBotId?: number;
}

export class OrderController {
  private pendingOrders: Order[] = [];
  private bots: Bot[] = [];
  private completedOrders: Order[] = [];
  private nextOrderId: number;
  private nextBotId: number;
  private logger: Logger;
  private scheduler: Scheduler;

  constructor(options: OrderControllerOptions) {
    this.logger = options.logger;
    this.scheduler = options.scheduler ?? realScheduler;
    this.nextOrderId = options.firstOrderId ?? FIRST_ORDER_ID;
    this.nextBotId = options.firstBotId ?? FIRST_BOT_ID;
    this.logger(`System initialized with ${this.bots.length} bots`);
  }

  private insertPending(order: Order): void {
    if (order.type === "VIP") {
      const firstNormal = this.pendingOrders.findIndex(
        (o) => o.type === "NORMAL",
      );
      if (firstNormal === -1) {
        this.pendingOrders.push(order);
      } else {
        this.pendingOrders.splice(firstNormal, 0, order);
      }
    } else {
      this.pendingOrders.push(order);
    }
  }

  createOrder(type: OrderType): Order {
    const order: Order = {
      id: this.nextOrderId++,
      type,
      status: "PENDING",
    };
    this.insertPending(order);
    this.logger(`Created ${type} Order #${order.id} - Status: ${order.status}`);
    this.dispatch();
    return order;
  }

  addBot(): Bot {
    const bot: Bot = {
      id: this.nextBotId++,
      status: "IDLE",
      currentOrder: null,
      timerHandle: null,
    };
    this.bots.push(bot);
    this.logger(`Bot #${bot.id} created - Status: ACTIVE`);
    this.dispatch();
    return bot;
  }

  removeBot(): void {
    if (this.bots.length === 0) {
      this.logger("No bot to remove");
      return;
    }
    const bot = this.bots.pop()!;
    if (bot.timerHandle) {
      bot.timerHandle.clear();
      bot.timerHandle = null;
    }
    if (bot.currentOrder) {
      const order = bot.currentOrder;
      order.status = "PENDING";
      this.insertPending(order);
      this.logger(`Bot #${bot.id} destroyed - Order #${order.id} returned to PENDING`);
    } else {
      this.logger(`Bot #${bot.id} destroyed while IDLE`);
    }
    this.dispatch();
  }

  private dispatch(): void {
    for (const bot of this.bots) {
      if (bot.status === "IDLE" && this.pendingOrders.length > 0) {
        this.pickup(bot);
      }
    }
  }

  private pickup(bot: Bot): void {
    const order = this.pendingOrders.shift();
    if (!order) return;
    bot.status = "ACTIVE";
    bot.currentOrder = order;
    order.status = "PROCESSING";
    this.logger(`Bot #${bot.id} picked up ${order.type} Order #${order.id} - Status: ${order.status}`);
    bot.timerHandle = this.scheduler.schedule(() => {
      this.completeOrder(bot);
    }, PROCESSING_TIME_MS);
  }

  private completeOrder(bot: Bot): void {
    bot.timerHandle = null;
    const order = bot.currentOrder;
    if (!order) return;
    order.status = "COMPLETE";
    bot.currentOrder = null;
    bot.status = "IDLE";
    this.completedOrders.push(order);
    this.logger(`Bot #${bot.id} completed ${order.type} Order #${order.id} - Status: ${order.status} (Processing time: 10s)`);
    if (this.pendingOrders.length > 0) {
      this.pickup(bot);
    } else {
      this.logger(`Bot #${bot.id} is now IDLE - No pending orders`);
    }
  }

  snapshot(): OrderControllerSnapshot {
    return {
      pending: this.pendingOrders.map((o) => ({ id: o.id, type: o.type })),
      processing: this.bots.filter((b) => b.currentOrder !== null).map((b) => ({ botId: b.id, orderId: b.currentOrder!.id })),
      complete: this.completedOrders.map((o) => ({ id: o.id, type: o.type })),
      bots: this.bots.map((b) => ({ id: b.id, status: b.status, currentOrderId: b.currentOrder?.id ?? null })),
    };
  }

  get pendingCount(): number {
    return this.pendingOrders.length;
  }

  get completedCount(): number {
    return this.completedOrders.length;
  }

  get botCount(): number {
    return this.bots.length;
  }

  vipCompletedCount(): number {
    return this.completedOrders.filter((o) => o.type === "VIP").length;
  }

  normalCompletedCount(): number {
    return this.completedOrders.filter((o) => o.type === "NORMAL").length;
  }
}
