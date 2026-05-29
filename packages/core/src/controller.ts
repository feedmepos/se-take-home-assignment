import { FakeScheduler, RealScheduler, type Scheduler, type SchedulerHandle } from "./scheduler.js";
import type {
  Bot,
  ControllerConfig,
  DispatchAssignment,
  DispatchContext,
  DispatchPolicy,
  DomainEvent,
  DomainEventType,
  Metrics,
  Order,
  OrderQueueComparator,
  OrderPriority,
  ProcessingDurationResolver,
  SystemSnapshot,
} from "./types.js";

interface ProcessingTask {
  handle: SchedulerHandle;
  orderId: number;
}

type Listener = (event: DomainEvent) => void;

export const DEFAULT_PROCESS_DURATION_MS = 10_000;
export const DEFAULT_MAX_EVENT_HISTORY = 100;

export class ControllerError extends Error {}

export class FifoDispatchPolicy implements DispatchPolicy {
  selectAssignments({ idleBots, pendingOrders }: DispatchContext): DispatchAssignment[] {
    const assignmentCount = Math.min(idleBots.length, pendingOrders.length);
    return Array.from({ length: assignmentCount }, (_, index) => ({
      botId: idleBots[index].id,
      orderId: pendingOrders[index].id,
    }));
  }
}

const defaultPriorityRank: Record<OrderPriority, number> = {
  vip: 0,
  normal: 1,
};

export const vipFirstQueueComparator: OrderQueueComparator = (left, right) =>
  defaultPriorityRank[left.priority] - defaultPriorityRank[right.priority] ||
  left.createdAt - right.createdAt ||
  left.id - right.id;

export class OrderController {
  private readonly scheduler: Scheduler;

  private readonly processDurationMs: number;

  private readonly dispatchPolicy: DispatchPolicy;

  private readonly maxEventHistory: number;

  private readonly orderQueueComparator: OrderQueueComparator;

  private readonly processingDurationResolver: ProcessingDurationResolver;

  private readonly createdAt: number;

  private nextOrderId: number;

  private nextBotId = 1;

  private nextEventId = 1;

  private readonly orders = new Map<number, Order>();

  private readonly bots = new Map<number, Bot>();

  private readonly pendingOrderIds: number[] = [];

  private readonly completedOrderIds: number[] = [];

  private readonly processingTasks = new Map<number, ProcessingTask>();

  private readonly listeners = new Set<Listener>();

  private readonly events: DomainEvent[] = [];

  private pendingCount = 0;

  private completedCount = 0;

  private readonly pendingCountsByPriority = new Map<OrderPriority, number>();

  private readonly completedCountsByPriority = new Map<OrderPriority, number>();

  private completedDurationTotalMs = 0;

  constructor(config: ControllerConfig = {}, scheduler: Scheduler = new RealScheduler()) {
    this.scheduler = scheduler;
    this.processDurationMs = config.processDurationMs ?? DEFAULT_PROCESS_DURATION_MS;
    this.dispatchPolicy = config.dispatchPolicy ?? new FifoDispatchPolicy();
    this.maxEventHistory = config.maxEventHistory ?? DEFAULT_MAX_EVENT_HISTORY;
    this.orderQueueComparator = config.orderQueueComparator ?? vipFirstQueueComparator;
    this.processingDurationResolver =
      config.processingDurationResolver ?? (() => this.processDurationMs);
    this.nextOrderId = config.initialOrderId ?? 1001;
    this.createdAt = this.scheduler.now();
  }

  createNormalOrder(): Order {
    return this.createOrder("normal");
  }

  createVipOrder(): Order {
    return this.createOrder("vip");
  }

  createOrder(priority: OrderPriority): Order {
    const now = this.scheduler.now();
    const order: Order = {
      id: this.nextOrderId++,
      priority,
      status: "pending",
      createdAt: now,
    };
    this.orders.set(order.id, order);
    this.insertPendingOrder(order);
    this.emit("order.created", `${this.formatPriority(priority)} Order #${order.id} created`, now, {
      orderId: order.id,
      priority,
    });
    this.maybeDispatch();
    return this.copyOrder(order);
  }

  addBot(): Bot {
    const now = this.scheduler.now();
    const bot: Bot = {
      id: this.nextBotId++,
      status: "idle",
      createdAt: now,
      lastUpdatedAt: now,
      completedOrders: 0,
    };
    this.bots.set(bot.id, bot);
    this.emit("bot.added", `Bot #${bot.id} created`, now);
    this.maybeDispatch();
    if (bot.status === "idle") {
      this.emit("bot.idle", `Bot #${bot.id} is idle`, this.scheduler.now());
    }
    return this.copyBot(bot);
  }

  removeLatestBot(): Bot {
    const latestBot = [...this.bots.values()].sort((left, right) => right.id - left.id)[0];
    if (!latestBot) {
      throw new ControllerError("No bots available to remove.");
    }
    return this.removeBot(latestBot.id);
  }

  removeBot(botId: number): Bot {
    const bot = this.bots.get(botId);
    if (!bot) {
      throw new ControllerError(`Bot #${botId} does not exist.`);
    }
    const now = this.scheduler.now();
    const assignedOrderId = bot.currentOrderId;

    if (assignedOrderId !== undefined) {
      const task = this.processingTasks.get(bot.id);
      if (task) {
        this.scheduler.clear(task.handle);
        this.processingTasks.delete(bot.id);
      }
      const order = this.orders.get(assignedOrderId);
      if (order) {
        this.requeueOrderFromBot(order, bot, now);
      }
    }

    this.bots.delete(bot.id);
    this.emit("bot.removed", `Bot #${bot.id} removed`, now, { botId: bot.id });
    this.maybeDispatch();
    return this.copyBot(bot);
  }

  getSnapshot(): SystemSnapshot {
    const pendingOrders = this.pendingOrderIds
      .map((id) => this.orders.get(id))
      .filter((order): order is Order => Boolean(order))
      .map((order) => this.copyOrder(order));

    const processingOrders = [...this.orders.values()]
      .filter((order) => order.status === "processing")
      .sort((left, right) => (left.processingStartedAt ?? 0) - (right.processingStartedAt ?? 0))
      .map((order) => this.copyOrder(order));

    const completedOrders = [...this.completedOrderIds]
      .map((id) => this.orders.get(id))
      .filter((order): order is Order => Boolean(order))
      .map((order) => this.copyOrder(order))
      .reverse();

    const bots = [...this.bots.values()]
      .sort((left, right) => left.id - right.id)
      .map((bot) => this.copyBot(bot));

    return {
      serverTime: this.scheduler.now(),
      processDurationMs: this.processDurationMs,
      pendingOrders,
      processingOrders,
      completedOrders,
      bots,
      metrics: this.computeMetrics(processingOrders, bots),
    };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getEvents(): DomainEvent[] {
    return this.events.map((event) => ({
      ...event,
      snapshot: this.copySnapshot(event.snapshot),
    }));
  }

  private insertPendingOrder(order: Order): void {
    order.status = "pending";
    this.pendingOrderIds.push(order.id);
    this.pendingOrderIds.sort((leftId, rightId) => {
      const left = this.orders.get(leftId);
      const right = this.orders.get(rightId);
      if (!left || !right) {
        return 0;
      }
      return this.orderQueueComparator(left, right);
    });
    this.pendingCount += 1;
    this.incrementPriorityCount(this.pendingCountsByPriority, order.priority);
  }

  private maybeDispatch(): void {
    const idleBots = [...this.bots.values()]
      .filter((bot) => bot.status === "idle")
      .sort((left, right) => left.id - right.id);

    const pendingOrders = this.pendingOrderIds
      .map((id) => this.orders.get(id))
      .filter((order): order is Order => Boolean(order));

    const assignedBotIds = new Set<number>();
    const assignedOrderIds = new Set<number>();

    for (const assignment of this.dispatchPolicy.selectAssignments({ idleBots, pendingOrders })) {
      if (assignedBotIds.has(assignment.botId) || assignedOrderIds.has(assignment.orderId)) {
        continue;
      }
      const bot = this.bots.get(assignment.botId);
      const order = this.orders.get(assignment.orderId);
      if (!bot || !order || bot.status !== "idle" || order.status !== "pending") {
        continue;
      }
      assignedBotIds.add(bot.id);
      assignedOrderIds.add(order.id);
      this.assignOrderToBot(order, bot, this.scheduler.now());
    }
  }

  private assignOrderToBot(order: Order, bot: Bot, now: number): void {
    this.removePendingOrder(order);
    order.status = "processing";
    order.assignedBotId = bot.id;
    order.processingStartedAt = now;
    bot.status = "processing";
    bot.currentOrderId = order.id;
    bot.lastUpdatedAt = now;
    const delayMs = this.processingDurationResolver(this.copyOrder(order), this.copyBot(bot));
    const handle = this.scheduler.schedule(delayMs, () => {
      this.completeOrder(bot.id, order.id);
    });
    this.processingTasks.set(bot.id, { handle, orderId: order.id });
    this.emit(
      "order.assigned",
      `Bot #${bot.id} picked up ${this.formatPriority(order.priority)} Order #${order.id}`,
      now,
      { botId: bot.id, orderId: order.id, priority: order.priority },
    );
  }

  private requeueOrderFromBot(order: Order, bot: Bot, now: number): void {
    order.assignedBotId = undefined;
    order.processingStartedAt = undefined;
    bot.status = "idle";
    bot.currentOrderId = undefined;
    bot.lastUpdatedAt = now;
    this.insertPendingOrder(order);
    this.emit(
      "order.requeued",
      `Order #${order.id} returned to pending after Bot #${bot.id} was removed`,
      now,
      { botId: bot.id, orderId: order.id, priority: order.priority },
    );
  }

  private completeOrder(botId: number, orderId: number): void {
    const bot = this.bots.get(botId);
    const order = this.orders.get(orderId);
    if (!bot || !order) {
      return;
    }

    const now = this.scheduler.now();
    this.processingTasks.delete(botId);
    order.status = "complete";
    order.completedAt = now;
    bot.status = "idle";
    bot.currentOrderId = undefined;
    bot.lastUpdatedAt = now;
    bot.completedOrders += 1;
    this.completedOrderIds.push(order.id);
    this.completedCount += 1;
    this.incrementPriorityCount(this.completedCountsByPriority, order.priority);
    if (order.processingStartedAt !== undefined) {
      this.completedDurationTotalMs += now - order.processingStartedAt;
    }
    this.emit(
      "order.completed",
      `Bot #${bot.id} completed ${this.formatPriority(order.priority)} Order #${order.id}`,
      now,
      { botId: bot.id, orderId: order.id, priority: order.priority },
    );
    this.maybeDispatch();
    if (bot.status === "idle") {
      this.emit("bot.idle", `Bot #${bot.id} is idle`, this.scheduler.now(), { botId: bot.id });
    }
  }

  private emit(
    type: DomainEventType,
    message: string,
    timestamp: number,
    payload?: DomainEvent["payload"],
  ): void {
    const event: DomainEvent = {
      id: this.nextEventId++,
      type,
      timestamp,
      message,
      payload,
      snapshot: this.getSnapshot(),
    };
    this.events.push(event);
    if (this.events.length > this.maxEventHistory) {
      this.events.splice(0, this.events.length - this.maxEventHistory);
    }
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private computeMetrics(
    processingOrders: Order[],
    bots: Bot[],
  ): Metrics {
    const averageProcessingTimeSeconds =
      this.completedCount > 0
        ? this.completedDurationTotalMs / this.completedCount / 1000
        : 0;

    const elapsedMinutes = Math.max((this.scheduler.now() - this.createdAt) / 60_000, 1 / 60);
    const processingBotCount = bots.filter((bot) => bot.status === "processing").length;

    return {
      pendingCount: this.pendingCount,
      processingCount: processingOrders.length,
      completedCount: this.completedCount,
      activeBotCount: bots.length,
      idleBotCount: bots.filter((bot) => bot.status === "idle").length,
      vipPendingCount: this.pendingCountsByPriority.get("vip") ?? 0,
      normalPendingCount: this.pendingCountsByPriority.get("normal") ?? 0,
      vipCompletedCount: this.completedCountsByPriority.get("vip") ?? 0,
      normalCompletedCount: this.completedCountsByPriority.get("normal") ?? 0,
      totalOrdersCreated: this.orders.size,
      averageProcessingTimeSeconds: Number(averageProcessingTimeSeconds.toFixed(1)),
      botUtilizationRate: bots.length === 0 ? 0 : Number((processingBotCount / bots.length).toFixed(2)),
      ordersCompletedPerMinute: Number((this.completedCount / elapsedMinutes).toFixed(2)),
    };
  }

  private removePendingOrder(order: Order): void {
    const index = this.pendingOrderIds.indexOf(order.id);
    if (index === -1) {
      return;
    }
    this.pendingOrderIds.splice(index, 1);
    this.pendingCount -= 1;
    this.incrementPriorityCount(this.pendingCountsByPriority, order.priority, -1);
  }

  private incrementPriorityCount(
    counts: Map<OrderPriority, number>,
    priority: OrderPriority,
    amount = 1,
  ): void {
    counts.set(priority, Math.max(0, (counts.get(priority) ?? 0) + amount));
  }

  private formatPriority(priority: OrderPriority): string {
    return priority.toUpperCase();
  }

  private copyOrder(order: Order): Order {
    return { ...order };
  }

  private copyBot(bot: Bot): Bot {
    return { ...bot };
  }

  private copySnapshot(snapshot: SystemSnapshot): SystemSnapshot {
    return {
      serverTime: snapshot.serverTime,
      processDurationMs: snapshot.processDurationMs,
      pendingOrders: snapshot.pendingOrders.map((order) => this.copyOrder(order)),
      processingOrders: snapshot.processingOrders.map((order) => this.copyOrder(order)),
      completedOrders: snapshot.completedOrders.map((order) => this.copyOrder(order)),
      bots: snapshot.bots.map((bot) => this.copyBot(bot)),
      metrics: { ...snapshot.metrics },
    };
  }
}

export function createOrderController(config?: ControllerConfig, scheduler?: Scheduler): OrderController {
  return new OrderController(config, scheduler);
}

export { FakeScheduler, RealScheduler };
