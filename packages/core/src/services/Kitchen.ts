import type { Clock, CancelHandle } from '../clock/Clock';
import { OrderType, BotStatus, PROCESSING_DURATION_MS } from '../types';
import { Order } from '../models/Order';
import { Bot } from '../models/Bot';
import { OrderQueue } from './OrderQueue';
import type {
  DomainEvent,
  DomainEventListener,
  OrderSnapshot,
  BotSnapshot,
  StateSnapshot,
} from '../events/DomainEvent';

/**
 * 聚合根 / 调度中枢。系统唯一的命令入口,持有队列、机器人、时钟与监听器。
 * 所有状态变更必经此处,以保证不变量(订单号唯一递增、优先级、计时一致)。
 */
export class Kitchen {
  private readonly queue = new OrderQueue();
  private readonly botList: Bot[] = [];
  private readonly completed: Order[] = [];
  private readonly listeners = new Set<DomainEventListener>();
  /** botId → 该 bot 当前处理订单的完成定时器取消句柄。 */
  private readonly timers = new Map<number, CancelHandle>();
  private nextOrderId: number;
  private nextBotId = 1;

  constructor(
    private readonly clock: Clock,
    startOrderId = 1,
  ) {
    this.nextOrderId = startOrderId;
  }

  // --- 查询 ---

  get bots(): readonly Bot[] {
    return this.botList;
  }

  /** 等待中的订单(VIP 段在前)。 */
  pendingOrders(): Order[] {
    return this.queue.snapshot();
  }

  /** 处理中的订单。 */
  processingOrders(): Order[] {
    return this.botList
      .map((bot) => bot.currentOrder)
      .filter((order): order is Order => order !== null);
  }

  completedOrders(): readonly Order[] {
    return this.completed;
  }

  /** 全量状态快照,用于 WS 首次连接 / 刷新下发。 */
  snapshot(): StateSnapshot {
    return {
      pending: this.pendingOrders().map(toOrderSnapshot),
      processing: this.processingOrders().map(toOrderSnapshot),
      complete: this.completed.map(toOrderSnapshot),
      bots: this.botList.map(toBotSnapshot),
    };
  }

  /** 订阅领域事件,返回取消订阅函数。 */
  on(listener: DomainEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // --- 命令 ---

  createOrder(type: OrderType): Order {
    const order = new Order(this.nextOrderId++, type, this.clock.now());
    this.queue.enqueue(order);
    this.emit({ kind: 'OrderCreated', at: this.clock.now(), order: toOrderSnapshot(order) });
    this.dispatch();
    return order;
  }

  addBot(): Bot {
    const bot = new Bot(this.nextBotId++);
    this.botList.push(bot);
    this.emit({ kind: 'BotAdded', at: this.clock.now(), botId: bot.id });
    this.dispatch();
    return bot;
  }

  /** 销毁最新创建的机器人;若其正在处理,中断计时并把订单按原优先级退回队列。 */
  removeBot(): Bot | null {
    const bot = this.botList.pop();
    if (!bot) return null;

    if (bot.status === BotStatus.PROCESSING) {
      this.cancelTimer(bot.id);
      const order = bot.abort();
      if (order) {
        order.markPending();
        this.queue.requeue(order);
        this.emit({ kind: 'OrderRequeued', at: this.clock.now(), orderId: order.id, botId: bot.id });
      }
    }

    this.emit({ kind: 'BotRemoved', at: this.clock.now(), botId: bot.id });
    this.dispatch();
    return bot;
  }

  // --- 内部调度 ---

  /** 把等待订单分配给空闲机器人,直到没有空闲机器人或没有待处理订单。 */
  private dispatch(): void {
    for (const bot of this.botList) {
      if (bot.status !== BotStatus.IDLE) continue;
      const order = this.queue.dequeue();
      if (!order) break;

      bot.assign(order);
      order.markProcessing();
      this.emit({ kind: 'OrderPickedUp', at: this.clock.now(), orderId: order.id, botId: bot.id });

      const cancel = this.clock.setTimeout(() => this.complete(bot), PROCESSING_DURATION_MS);
      this.timers.set(bot.id, cancel);
    }
  }

  private complete(bot: Bot): void {
    this.timers.delete(bot.id);
    const order = bot.currentOrder;
    if (order) {
      order.markComplete(this.clock.now());
      this.completed.push(order);
      bot.finish();
      this.emit({ kind: 'OrderCompleted', at: this.clock.now(), orderId: order.id, botId: bot.id });
    }
    this.dispatch();
  }

  private cancelTimer(botId: number): void {
    const cancel = this.timers.get(botId);
    cancel?.();
    this.timers.delete(botId);
  }

  private emit(event: DomainEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}

function toOrderSnapshot(order: Order): OrderSnapshot {
  return {
    id: order.id,
    type: order.type,
    status: order.status,
    createdAt: order.createdAt,
    completedAt: order.completedAt,
  };
}

function toBotSnapshot(bot: Bot): BotSnapshot {
  return {
    id: bot.id,
    status: bot.status,
    currentOrderId: bot.currentOrder?.id ?? null,
  };
}
