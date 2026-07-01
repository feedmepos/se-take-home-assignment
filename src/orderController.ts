export type OrderType = "VIP" | "NORMAL";
export type OrderStatus = "PENDING" | "PROCESSING" | "COMPLETE";
export type BotStatus = "IDLE" | "PROCESSING";

export interface Order {
  id: number;
  type: OrderType;
  status: OrderStatus;
  createdAt: number;
  assignedBotId?: number;
  pickedAt?: number;
  completedAt?: number;
}

export interface Bot {
  id: number;
  status: BotStatus;
  currentOrderId?: number;
}

export interface EventLog {
  id: number;
  at: number;
  message: string;
}

export interface ControllerState {
  orders: Order[];
  bots: Bot[];
  pendingOrderIds: number[];
  logs: EventLog[];
}

const PROCESSING_MS = 10_000;

export class OrderController {
  private orders = new Map<number, Order>();
  private bots = new Map<number, Bot>();
  private pendingOrderIds: number[] = [];
  private logs: EventLog[] = [];
  private nextOrderId = 1001;
  private nextBotId = 1;
  private nextLogId = 1;

  createOrder(type: OrderType, now = Date.now()): ControllerState {
    const order: Order = {
      id: this.nextOrderId,
      type,
      status: "PENDING",
      createdAt: now,
    };

    this.nextOrderId += 1;
    this.orders.set(order.id, order);
    this.insertPendingOrder(order);
    this.log(now, `Created ${formatOrderType(type)} Order #${order.id} - Status: PENDING`);
    this.assignPendingOrders(now);

    return this.getState();
  }

  addBot(now = Date.now()): ControllerState {
    const bot: Bot = {
      id: this.nextBotId,
      status: "IDLE",
    };

    this.nextBotId += 1;
    this.bots.set(bot.id, bot);
    this.log(now, `Bot #${bot.id} created - Status: IDLE`);
    this.assignPendingOrders(now);

    return this.getState();
  }

  removeNewestBot(now = Date.now()): ControllerState {
    const newestBot = this.getBots().at(-1);

    if (!newestBot) {
      this.log(now, "No bot available to destroy");
      return this.getState();
    }

    this.bots.delete(newestBot.id);

    if (newestBot.currentOrderId) {
      const order = this.orders.get(newestBot.currentOrderId);

      if (order) {
        order.status = "PENDING";
        order.assignedBotId = undefined;
        order.pickedAt = undefined;
        this.insertPendingOrder(order);
        this.log(
          now,
          `Bot #${newestBot.id} destroyed while processing ${formatOrderType(order.type)} Order #${order.id}; order returned to PENDING`,
        );
      }
    } else {
      this.log(now, `Bot #${newestBot.id} destroyed while IDLE`);
    }

    this.assignPendingOrders(now);
    return this.getState();
  }

  tick(now = Date.now()): ControllerState {
    for (const bot of this.getBots()) {
      if (bot.status !== "PROCESSING" || !bot.currentOrderId) {
        continue;
      }

      const order = this.orders.get(bot.currentOrderId);
      if (order?.pickedAt === undefined || now - order.pickedAt < PROCESSING_MS) {
        continue;
      }

      order.status = "COMPLETE";
      order.completedAt = now;
      order.assignedBotId = undefined;

      this.log(
        now,
        `Bot #${bot.id} completed ${formatOrderType(order.type)} Order #${order.id} - Status: COMPLETE`,
      );

      bot.status = "IDLE";
      bot.currentOrderId = undefined;
    }

    this.assignPendingOrders(now);
    return this.getState();
  }

  reset(now = Date.now()): ControllerState {
    this.orders.clear();
    this.bots.clear();
    this.pendingOrderIds = [];
    this.logs = [];
    this.nextOrderId = 1001;
    this.nextBotId = 1;
    this.nextLogId = 1;
    this.log(now, "System reset with 0 bots and 0 orders");
    return this.getState();
  }

  getState(): ControllerState {
    return {
      orders: Array.from(this.orders.values()).map((order) => ({ ...order })),
      bots: this.getBots().map((bot) => ({ ...bot })),
      pendingOrderIds: [...this.pendingOrderIds],
      logs: [...this.logs],
    };
  }

  private assignPendingOrders(now: number): void {
    for (const bot of this.getBots()) {
      if (bot.status !== "IDLE" || this.pendingOrderIds.length === 0) {
        continue;
      }

      const orderId = this.pendingOrderIds.shift();
      if (!orderId) {
        continue;
      }

      const order = this.orders.get(orderId);
      if (!order) {
        continue;
      }

      order.status = "PROCESSING";
      order.assignedBotId = bot.id;
      order.pickedAt = now;
      bot.status = "PROCESSING";
      bot.currentOrderId = order.id;

      this.log(now, `Bot #${bot.id} picked up ${formatOrderType(order.type)} Order #${order.id} - Status: PROCESSING`);
    }
  }

  private insertPendingOrder(order: Order): void {
    this.pendingOrderIds = this.pendingOrderIds.filter((id) => id !== order.id);

    const insertAt = this.pendingOrderIds.findIndex((id) => {
      const queuedOrder = this.orders.get(id);
      if (!queuedOrder) {
        return false;
      }

      if (order.type === "VIP" && queuedOrder.type === "NORMAL") {
        return true;
      }

      return order.type === queuedOrder.type && order.createdAt < queuedOrder.createdAt;
    });

    if (insertAt === -1) {
      this.pendingOrderIds.push(order.id);
      return;
    }

    this.pendingOrderIds.splice(insertAt, 0, order.id);
  }

  private getBots(): Bot[] {
    return Array.from(this.bots.values()).sort((a, b) => a.id - b.id);
  }

  private log(at: number, message: string): void {
    this.logs.unshift({
      id: this.nextLogId,
      at,
      message,
    });
    this.nextLogId += 1;
  }
}

export function formatOrderType(type: OrderType): string {
  return type === "VIP" ? "VIP" : "Normal";
}

export function formatClock(timestamp: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}

export function getOrderProgress(order: Order, now: number): number {
  if (order.status !== "PROCESSING" || order.pickedAt === undefined) {
    return 0;
  }

  return Math.min(100, Math.max(0, ((now - order.pickedAt) / PROCESSING_MS) * 100));
}

export function getRemainingSeconds(order: Order, now: number): number {
  if (order.status !== "PROCESSING" || order.pickedAt === undefined) {
    return 0;
  }

  return Math.max(0, Math.ceil((PROCESSING_MS - (now - order.pickedAt)) / 1000));
}
