import {
  BotSnapshot,
  CompletedOrder,
  ControllerStatus,
  BotIdleListener,
  Order,
  OrderCompletedListener,
  OrderControllerOptions,
  OrderStartedListener,
  OrderType,
  TimerAdapter,
  TimerHandle,
  ActiveBot,
} from "./orderController.types";

const defaultTimerAdapter: TimerAdapter = {
  schedule(callback, delayMs) {
    const timeout = setTimeout(callback, delayMs);

    return { id: Number(timeout), reference: timeout };
  },
  cancel(handle) {
    clearTimeout(handle.reference ?? handle.id);
  },
};

export class OrderController {
  private readonly processingTimeMs: number;
  private readonly timerAdapter: TimerAdapter;
  private readonly now: () => Date;
  private readonly onOrderCompleted: OrderCompletedListener | null;
  private readonly onOrderStarted: OrderStartedListener | null;
  private readonly onBotIdle: BotIdleListener | null;
  private nextOrderId = 1;
  private nextBotId = 1;
  private readonly pendingOrders: Order[] = [];
  private readonly completedOrders: CompletedOrder[] = [];
  private readonly bots: ActiveBot[] = [];

  constructor(options: OrderControllerOptions = {}) {
    this.processingTimeMs = options.processingTimeMs ?? 10_000;
    this.timerAdapter = options.timerAdapter ?? defaultTimerAdapter;
    this.now = options.now ?? (() => new Date());
    this.onOrderCompleted = options.onOrderCompleted ?? null;
    this.onOrderStarted = options.onOrderStarted ?? null;
    this.onBotIdle = options.onBotIdle ?? null;
  }

  addNormalOrders(count: number): Order[] {
    return this.addOrders("NORMAL", count);
  }

  addVipOrders(count: number): Order[] {
    return this.addOrders("VIP", count);
  }

  addBot(): BotSnapshot {
    const bot: ActiveBot = {
      id: this.nextBotId++,
      currentOrder: null,
      timerHandle: null,
    };

    this.bots.push(bot);
    this.tryAssignOrders();

    return this.toBotSnapshot(bot);
  }

  removeBot(): BotSnapshot | null {
    const bot = this.bots.at(-1);

    if (!bot) {
      return null;
    }

    if (bot.timerHandle && bot.currentOrder) {
      this.timerAdapter.cancel(bot.timerHandle);
      this.requeueInterruptedOrder(bot.currentOrder);
      bot.timerHandle = null;
      bot.currentOrder = null;
    }

    this.bots.pop();
    this.tryAssignOrders();

    return this.toBotSnapshot(bot);
  }

  getStatus(): ControllerStatus {
    return {
      pendingOrders: this.pendingOrders.map((order) => ({ ...order })),
      completedOrders: this.completedOrders.map((order) => ({ ...order })),
      bots: this.bots.map((bot) => this.toBotSnapshot(bot)),
    };
  }

  private addOrders(type: OrderType, count: number): Order[] {
    this.assertPositiveInteger(count);

    const addedOrders: Order[] = [];

    for (let index = 0; index < count; index += 1) {
      const order: Order = {
        id: this.nextOrderId++,
        type,
      };

      this.insertPendingOrder(order);
      addedOrders.push(order);
    }

    this.tryAssignOrders();

    return addedOrders;
  }

  private insertPendingOrder(order: Order): void {
    if (order.type === "VIP") {
      const firstNormalIndex = this.pendingOrders.findIndex(
        (pendingOrder) => pendingOrder.type === "NORMAL",
      );

      if (firstNormalIndex === -1) {
        this.pendingOrders.push(order);
        return;
      }

      this.pendingOrders.splice(firstNormalIndex, 0, order);
      return;
    }

    this.pendingOrders.push(order);
  }

  private requeueInterruptedOrder(order: Order): void {
    if (order.type === "VIP") {
      const firstVipIndex = this.pendingOrders.findIndex(
        (pendingOrder) => pendingOrder.type === "VIP",
      );

      if (firstVipIndex === -1) {
        this.insertPendingOrder(order);
        return;
      }

      this.pendingOrders.splice(firstVipIndex, 0, order);
      return;
    }

    const firstNormalIndex = this.pendingOrders.findIndex(
      (pendingOrder) => pendingOrder.type === "NORMAL",
    );

    if (firstNormalIndex === -1) {
      this.pendingOrders.push(order);
      return;
    }

    this.pendingOrders.splice(firstNormalIndex, 0, order);
  }

  private tryAssignOrders(): void {
    for (const bot of this.bots) {
      if (bot.currentOrder || this.pendingOrders.length === 0) {
        continue;
      }

      const nextOrder = this.pendingOrders.shift();

      if (!nextOrder) {
        continue;
      }

      bot.currentOrder = nextOrder;
      this.onOrderStarted?.(bot.id, { ...nextOrder });
      bot.timerHandle = this.timerAdapter.schedule(() => {
        this.completeOrder(bot.id, nextOrder);
      }, this.processingTimeMs);
    }
  }

  private completeOrder(botId: number, order: Order): void {
    const bot = this.bots.find((currentBot) => currentBot.id === botId);

    if (!bot || !bot.currentOrder || bot.currentOrder.id !== order.id) {
      return;
    }

    bot.currentOrder = null;
    bot.timerHandle = null;

    const completedOrder: CompletedOrder = {
      ...order,
      completedAt: this.formatTimestamp(this.now()),
    };

    this.completedOrders.push(completedOrder);
    this.onOrderCompleted?.({ ...completedOrder });

    this.tryAssignOrders();

    if (!bot.currentOrder) {
      this.onBotIdle?.(bot.id);
    }
  }

  private toBotSnapshot(bot: ActiveBot): BotSnapshot {
    return {
      id: bot.id,
      status: bot.currentOrder ? "PROCESSING" : "IDLE",
      currentOrder: bot.currentOrder ? { ...bot.currentOrder } : null,
    };
  }

  private formatTimestamp(date: Date): string {
    return date.toTimeString().slice(0, 8);
  }

  private assertPositiveInteger(count: number): void {
    if (!Number.isInteger(count) || count <= 0) {
      throw new Error("Order count must be a positive integer.");
    }
  }
}
