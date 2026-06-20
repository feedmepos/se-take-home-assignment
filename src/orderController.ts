import {
  BOT_STATUS,
  ORDER_STATUS,
  ORDER_TYPES,
  toBotId,
  toOrderId,
} from "./domain.js";
import type {
  BotId,
  BotSnapshot,
  ControllerSnapshot,
  OrderControllerOptions,
  OrderId,
  OrderSnapshot,
  OrderStatus,
  OrderType,
  Seconds,
} from "./domain.js";
import { formatSecondsAsTime, parseTimeToSeconds, toSeconds } from "./time.js";

interface Order {
  id: OrderId;
  type: OrderType;
  status: OrderStatus;
  createdAt: Seconds;
  startedAt: Seconds | null;
  completedAt: Seconds | null;
}

interface IdleBot {
  id: BotId;
  status: typeof BOT_STATUS.IDLE;
  order: null;
  startedAt: null;
  completeAt: null;
}

interface ProcessingBot {
  id: BotId;
  status: typeof BOT_STATUS.PROCESSING;
  order: Order;
  startedAt: Seconds;
  completeAt: Seconds;
}

type Bot = IdleBot | ProcessingBot;

interface EventLogEntry {
  time: string;
  message: string;
}

const ORDER_PRIORITY = {
  [ORDER_TYPES.VIP]: 0,
  [ORDER_TYPES.NORMAL]: 1,
} satisfies Record<OrderType, number>;

export class OrderController {
  readonly processingSeconds: Seconds;

  private currentTime: Seconds;
  private nextOrderId: number;
  private nextBotId = 1;
  private pendingOrders: Order[] = [];
  private completedOrders: Order[] = [];
  private bots: Bot[] = [];
  private events: EventLogEntry[] = [];

  constructor(options: OrderControllerOptions = {}) {
    this.processingSeconds = toSeconds(options.processingSeconds ?? 10);
    this.currentTime = parseTimeToSeconds(options.startTime ?? "00:00:00");
    this.nextOrderId = options.firstOrderId ?? 1001;

    this.log("System initialized with 0 bots");
  }

  addNormalOrder(): OrderSnapshot {
    return copyOrder(this.addOrder(ORDER_TYPES.NORMAL));
  }

  addVipOrder(): OrderSnapshot {
    return copyOrder(this.addOrder(ORDER_TYPES.VIP));
  }

  addBot(): BotSnapshot {
    const bot: IdleBot = {
      id: toBotId(this.nextBotId++),
      status: BOT_STATUS.IDLE,
      order: null,
      startedAt: null,
      completeAt: null,
    };

    this.bots.push(bot);
    this.log(`Bot #${bot.id} created - Status: ${BOT_STATUS.IDLE}`);
    this.dispatchIdleBots();
    return copyBot(this.findBot(bot.id) ?? bot, this.currentTime);
  }

  removeBot(): BotSnapshot | null {
    if (this.bots.length === 0) {
      this.log("No bot available to destroy");
      return null;
    }

    const newestBot = this.bots.reduce((newest, bot) =>
      bot.id > newest.id ? bot : newest
    );

    this.bots = this.bots.filter((bot) => bot.id !== newestBot.id);

    if (isProcessingBot(newestBot)) {
      const order = newestBot.order;
      this.insertPendingOrder(order);
      this.log(
        `Bot #${newestBot.id} destroyed while processing ${labelForOrder(order)} - order returned to ${ORDER_STATUS.PENDING}`
      );
      this.dispatchIdleBots();
      return copyBot(newestBot, this.currentTime);
    }

    this.log(`Bot #${newestBot.id} destroyed while ${BOT_STATUS.IDLE}`);
    return copyBot(newestBot, this.currentTime);
  }

  advanceTime(seconds: number): void {
    if (!Number.isInteger(seconds) || seconds < 0) {
      throw new Error("advanceTime expects a non-negative integer number of seconds");
    }

    const targetTime = toSeconds(this.currentTime + seconds);

    while (true) {
      const nextCompletion = this.nextCompletionAt(targetTime);
      if (nextCompletion === null) {
        this.currentTime = targetTime;
        return;
      }

      this.currentTime = nextCompletion;
      this.completeDueOrders();
    }
  }

  getSnapshot(): ControllerSnapshot {
    return {
      time: formatSecondsAsTime(this.currentTime),
      pendingOrders: this.pendingOrders.map(copyOrder),
      processingOrders: this.bots.filter(isProcessingBot).map((bot) => ({
        botId: bot.id,
        order: copyOrder(bot.order),
        remainingSeconds: Math.max(0, bot.completeAt - this.currentTime),
      })),
      completedOrders: this.completedOrders.map(copyOrder),
      bots: this.bots
        .slice()
        .sort((a, b) => a.id - b.id)
        .map((bot) => copyBot(bot, this.currentTime)),
    };
  }

  formatEvents(): string[] {
    return this.events.map((event) => `[${event.time}] ${event.message}`);
  }

  private addOrder(type: OrderType): Order {
    const order: Order = {
      id: toOrderId(this.nextOrderId++),
      type,
      status: ORDER_STATUS.PENDING,
      createdAt: this.currentTime,
      startedAt: null,
      completedAt: null,
    };

    this.insertPendingOrder(order);
    this.log(`Created ${labelForOrder(order)} - Status: ${ORDER_STATUS.PENDING}`);
    this.dispatchIdleBots();
    return order;
  }

  private insertPendingOrder(order: Order): void {
    order.status = ORDER_STATUS.PENDING;
    order.startedAt = null;
    order.completedAt = null;

    this.pendingOrders.push(order);
    this.pendingOrders.sort((a, b) => {
      const priorityDifference = ORDER_PRIORITY[a.type] - ORDER_PRIORITY[b.type];
      return priorityDifference === 0 ? a.id - b.id : priorityDifference;
    });
  }

  private dispatchIdleBots(): void {
    const idleBotIds = this.bots
      .filter(isIdleBot)
      .sort((a, b) => a.id - b.id)
      .map((bot) => bot.id);

    for (const botId of idleBotIds) {
      const order = this.pendingOrders.shift();
      if (!order) {
        return;
      }

      const botIndex = this.bots.findIndex((bot) => bot.id === botId);
      if (botIndex === -1) {
        continue;
      }

      const processingBot: ProcessingBot = {
        id: botId,
        status: BOT_STATUS.PROCESSING,
        order,
        startedAt: this.currentTime,
        completeAt: toSeconds(this.currentTime + this.processingSeconds),
      };

      this.bots[botIndex] = processingBot;
      order.status = ORDER_STATUS.PROCESSING;
      order.startedAt = this.currentTime;

      this.log(
        `Bot #${processingBot.id} picked up ${labelForOrder(order)} - Status: ${ORDER_STATUS.PROCESSING}`
      );
    }
  }

  private nextCompletionAt(targetTime: Seconds): Seconds | null {
    const completionTimes = this.bots
      .filter(isProcessingBot)
      .map((bot) => bot.completeAt)
      .filter((completeAt) => completeAt <= targetTime);

    if (completionTimes.length === 0) {
      return null;
    }

    return toSeconds(Math.min(...completionTimes));
  }

  private completeDueOrders(): void {
    const dueBots = this.bots
      .filter(
        (bot): bot is ProcessingBot =>
          isProcessingBot(bot) && bot.completeAt === this.currentTime
      )
      .sort((a, b) => a.id - b.id);

    const completedBotIds: BotId[] = [];

    for (const bot of dueBots) {
      const order = bot.order;
      order.status = ORDER_STATUS.COMPLETE;
      order.completedAt = this.currentTime;
      this.completedOrders.push(order);

      this.log(
        `Bot #${bot.id} completed ${labelForOrder(order)} - Status: ${ORDER_STATUS.COMPLETE} (Processing time: ${this.processingSeconds}s)`
      );

      const botIndex = this.bots.findIndex((candidate) => candidate.id === bot.id);
      if (botIndex !== -1) {
        this.bots[botIndex] = {
          id: bot.id,
          status: BOT_STATUS.IDLE,
          order: null,
          startedAt: null,
          completeAt: null,
        };
      }

      completedBotIds.push(bot.id);
    }

    this.dispatchIdleBots();

    for (const botId of completedBotIds) {
      const bot = this.bots.find((candidate) => candidate.id === botId);
      if (bot && isIdleBot(bot)) {
        this.log(`Bot #${bot.id} is now ${BOT_STATUS.IDLE} - No pending orders`);
      }
    }
  }

  private log(message: string): void {
    this.events.push({
      time: formatSecondsAsTime(this.currentTime),
      message,
    });
  }

  private findBot(id: BotId): Bot | undefined {
    return this.bots.find((bot) => bot.id === id);
  }
}

function isIdleBot(bot: Bot): bot is IdleBot {
  return bot.status === BOT_STATUS.IDLE;
}

function isProcessingBot(bot: Bot): bot is ProcessingBot {
  return bot.status === BOT_STATUS.PROCESSING;
}

function labelForOrder(order: Order): string {
  const typeLabel = order.type === ORDER_TYPES.VIP ? "VIP" : "Normal";
  return `${typeLabel} Order #${order.id}`;
}

function copyOrder(order: Order): OrderSnapshot {
  return {
    id: order.id,
    type: order.type,
    status: order.status,
    createdAt: formatSecondsAsTime(order.createdAt),
    startedAt: order.startedAt === null ? null : formatSecondsAsTime(order.startedAt),
    completedAt:
      order.completedAt === null ? null : formatSecondsAsTime(order.completedAt),
  };
}

function copyBot(bot: Bot, currentTime: Seconds): BotSnapshot {
  if (isProcessingBot(bot)) {
    return {
      id: bot.id,
      status: bot.status,
      orderId: bot.order.id,
      orderType: bot.order.type,
      remainingSeconds: Math.max(0, bot.completeAt - currentTime),
    };
  }

  return {
    id: bot.id,
    status: bot.status,
    orderId: null,
    orderType: null,
    remainingSeconds: 0,
  };
}
