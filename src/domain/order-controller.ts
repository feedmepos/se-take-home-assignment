export const ORDER_TYPES = {
  NORMAL: 'NORMAL',
  VIP: 'VIP',
} as const;

export const ORDER_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETE: 'COMPLETE',
} as const;

export const BOT_STATUS = {
  IDLE: 'IDLE',
  PROCESSING: 'PROCESSING',
} as const;

export const EVENT_TYPES = {
  SYSTEM_INITIALIZED: 'SYSTEM_INITIALIZED',
  ORDER_CREATED: 'ORDER_CREATED',
  ORDER_PICKED_UP: 'ORDER_PICKED_UP',
  ORDER_COMPLETED: 'ORDER_COMPLETED',
  BOT_CREATED: 'BOT_CREATED',
  BOT_DESTROYED: 'BOT_DESTROYED',
  BOT_IDLE: 'BOT_IDLE',
} as const;

export type OrderType = (typeof ORDER_TYPES)[keyof typeof ORDER_TYPES];
export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];
export type BotStatus = (typeof BOT_STATUS)[keyof typeof BOT_STATUS];
export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

export type Order = {
  id: number;
  type: OrderType;
  status: OrderStatus;
  createdSequence: number;
};

export type Bot = {
  id: number;
  status: BotStatus;
  order: Order | null;
  startedAt: number | null;
  completesAt: number | null;
};

export type ControllerEvent = {
  type: EventType;
  at: number;
  bot?: Bot;
  order?: Order;
  message: string;
};

type OrderControllerOptions = {
  firstOrderNumber?: number;
  processingSeconds?: number;
};

export class OrderController {
  private nextOrderNumber: number;
  private nextOrderSequence = 1;
  private nextBotId = 1;
  private currentSecond = 0;
  private readonly processingSeconds: number;
  private readonly events: ControllerEvent[] = [];
  readonly pendingOrders: Order[] = [];
  readonly completedOrders: Order[] = [];
  readonly bots: Bot[] = [];

  constructor({
    firstOrderNumber = 1001,
    processingSeconds = 10,
  }: OrderControllerOptions = {}) {
    this.nextOrderNumber = firstOrderNumber;
    this.processingSeconds = processingSeconds;
    this.record({
      type: EVENT_TYPES.SYSTEM_INITIALIZED,
      message: 'System initialized with 0 bots',
    });
  }

  get now(): number {
    return this.currentSecond;
  }

  createOrder(type: OrderType, at = this.currentSecond): Order {
    this.moveClockTo(at);

    const order: Order = {
      id: this.nextOrderNumber,
      type,
      status: ORDER_STATUS.PENDING,
      createdSequence: this.nextOrderSequence,
    };

    this.nextOrderNumber += 1;
    this.nextOrderSequence += 1;
    this.enqueuePendingOrder(order);
    this.record({
      type: EVENT_TYPES.ORDER_CREATED,
      order,
      message: `Created ${formatOrderLabel(order)} - Status: ${ORDER_STATUS.PENDING}`,
    });
    this.scheduleIdleBots();
    return order;
  }

  addBot(at = this.currentSecond): Bot {
    this.moveClockTo(at);

    const bot: Bot = {
      id: this.nextBotId,
      status: BOT_STATUS.IDLE,
      order: null,
      startedAt: null,
      completesAt: null,
    };

    this.nextBotId += 1;
    this.bots.push(bot);
    this.record({
      type: EVENT_TYPES.BOT_CREATED,
      bot,
      message: `Bot #${bot.id} created - Status: ${BOT_STATUS.IDLE}`,
    });
    this.scheduleIdleBots();
    return bot;
  }

  removeNewestBot(at = this.currentSecond): Bot | null {
    this.moveClockTo(at);
    const bot = this.bots.pop();

    if (!bot) {
      return null;
    }

    const interruptedOrder = bot.order;
    if (interruptedOrder) {
      interruptedOrder.status = ORDER_STATUS.PENDING;
      this.enqueuePendingOrder(interruptedOrder);
      this.record({
        type: EVENT_TYPES.BOT_DESTROYED,
        bot,
        order: interruptedOrder,
        message: `Bot #${bot.id} destroyed while processing ${formatOrderLabel(interruptedOrder)} - order returned to PENDING`,
      });
    } else {
      this.record({
        type: EVENT_TYPES.BOT_DESTROYED,
        bot,
        message: `Bot #${bot.id} destroyed while ${BOT_STATUS.IDLE}`,
      });
    }

    bot.status = BOT_STATUS.IDLE;
    bot.order = null;
    bot.startedAt = null;
    bot.completesAt = null;
    this.scheduleIdleBots();
    return bot;
  }

  advanceTo(targetSecond: number): void {
    if (targetSecond < this.currentSecond) {
      throw new Error('Cannot move simulated time backwards');
    }

    let nextCompletion = this.findNextCompletionBeforeOrAt(targetSecond);
    while (nextCompletion) {
      this.currentSecond = nextCompletion.completesAt;
      this.completeOrder(nextCompletion);
      this.scheduleIdleBots();
      nextCompletion = this.findNextCompletionBeforeOrAt(targetSecond);
    }

    this.currentSecond = targetSecond;
  }

  drainEvents(): ControllerEvent[] {
    return this.events.splice(0, this.events.length);
  }

  snapshot() {
    return {
      now: this.currentSecond,
      pendingOrders: this.pendingOrders.map((order) => ({ ...order })),
      processingOrders: this.bots
        .filter((bot) => bot.order)
        .map((bot) => ({
          botId: bot.id,
          order: bot.order ? { ...bot.order } : null,
          completesAt: bot.completesAt,
        })),
      completedOrders: this.completedOrders.map((order) => ({ ...order })),
      bots: this.bots.map((bot) => ({
        id: bot.id,
        status: bot.status,
        orderId: bot.order?.id ?? null,
        completesAt: bot.completesAt,
      })),
    };
  }

  private moveClockTo(second: number): void {
    if (second < this.currentSecond) {
      throw new Error('Cannot move simulated time backwards');
    }

    this.advanceTo(second);
  }

  private scheduleIdleBots(): void {
    for (const bot of this.bots) {
      if (bot.status !== BOT_STATUS.IDLE || this.pendingOrders.length === 0) {
        continue;
      }

      const order = this.pendingOrders.shift();
      if (!order) {
        continue;
      }

      order.status = ORDER_STATUS.PROCESSING;
      bot.status = BOT_STATUS.PROCESSING;
      bot.order = order;
      bot.startedAt = this.currentSecond;
      bot.completesAt = this.currentSecond + this.processingSeconds;
      this.record({
        type: EVENT_TYPES.ORDER_PICKED_UP,
        bot,
        order,
        message: `Bot #${bot.id} picked up ${formatOrderLabel(order)} - Status: ${ORDER_STATUS.PROCESSING}`,
      });
    }
  }

  private completeOrder(bot: Bot): void {
    if (!bot.order) {
      return;
    }

    const order = bot.order;
    order.status = ORDER_STATUS.COMPLETE;
    this.completedOrders.push(order);
    bot.status = BOT_STATUS.IDLE;
    bot.order = null;
    bot.startedAt = null;
    bot.completesAt = null;
    this.record({
      type: EVENT_TYPES.ORDER_COMPLETED,
      bot,
      order,
      message: `Bot #${bot.id} completed ${formatOrderLabel(order)} - Status: ${ORDER_STATUS.COMPLETE} (Processing time: ${this.processingSeconds}s)`,
    });

    if (this.pendingOrders.length === 0) {
      this.record({
        type: EVENT_TYPES.BOT_IDLE,
        bot,
        message: `Bot #${bot.id} is now ${BOT_STATUS.IDLE} - No pending orders`,
      });
    }
  }

  private enqueuePendingOrder(order: Order): void {
    this.pendingOrders.push(order);
    this.pendingOrders.sort(comparePendingOrders);
  }

  private findNextCompletionBeforeOrAt(
    targetSecond: number,
  ): (Bot & { completesAt: number }) | null {
    const dueBots = this.bots
      .filter((bot): bot is Bot & { completesAt: number } => (
        bot.completesAt !== null && bot.completesAt <= targetSecond
      ))
      .sort((left, right) => {
        if (left.completesAt !== right.completesAt) {
          return left.completesAt - right.completesAt;
        }

        return left.id - right.id;
      });

    return dueBots[0] ?? null;
  }

  private record(event: Omit<ControllerEvent, 'at'>): void {
    this.events.push({
      at: this.currentSecond,
      ...event,
    });
  }
}

export function comparePendingOrders(left: Order, right: Order): number {
  const leftPriority = left.type === ORDER_TYPES.VIP ? 0 : 1;
  const rightPriority = right.type === ORDER_TYPES.VIP ? 0 : 1;

  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  return left.createdSequence - right.createdSequence;
}

export function formatOrderLabel(order: Order): string {
  const typeLabel = order.type === ORDER_TYPES.VIP ? 'VIP' : 'Normal';
  return `${typeLabel} Order #${order.id}`;
}
