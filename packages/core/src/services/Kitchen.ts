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

  addBot(_processingDurationMs?: number): Bot {
    const bot = new Bot(this.nextBotId++, _processingDurationMs ?? PROCESSING_DURATION_MS);
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
        this.emit({
          kind: 'OrderRequeued',
          at: this.clock.now(),
          orderId: order.id,
          botId: bot.id,
        });
      }
    }

    this.emit({ kind: 'BotRemoved', at: this.clock.now(), botId: bot.id });
    this.dispatch();
    return bot;
  }

  // --- 内部调度 ---

  /**
   * 按优先级把等待订单分配给机器人。每次调度都「预测式」重新评估,不持久预分配:
   *
   * - **VIP(最优分配)**:把所有等待 VIP 按 FIFO 顺序做贪心模拟,逐个分配给「预计完成最早」
   *   的 bot —— 就绪时刻 readyAt = 空闲时为 now、已被本轮模拟占用时累加其 processingTime,
   *   因此 fast bot 会先吃下「排队仍划算」的若干单,超出的自动分流给空闲的 slow bot。
   *   模拟后,只把「当前真正空闲 bot 的首个分配」立即开工(可能取队列中间的 VIP);
   *   其余 VIP 留在队列,待某 bot 完成(或机器人增删)触发下次 dispatch 重新评估。
   * - **Normal**:严格让位于 VIP —— 只有当不存在任何等待 VIP 时,才把 Normal 派给第一个空闲 bot。
   */
  private dispatch(): void {
    for (;;) {
      // VIP 优先:开工本轮模拟得出的、当前空闲 bot 应处理的 VIP。
      const startedVip = this.dispatchVipRound();
      if (startedVip) continue;

      // 仍有等待 VIP(都在等忙碌的最优 bot)→ 严格 VIP 优先,不让 Normal 占用空闲 bot。
      if (this.queue.hasVip()) break;

      // 没有等待 VIP 了,普通订单派给第一个空闲 bot。
      const idle = this.firstIdleBot();
      const normal = this.queue.normalPending[0];
      if (!idle || !normal) break;
      this.queue.remove(normal);
      this.startProcessing(idle, normal);
    }
  }

  /**
   * 对所有等待 VIP 做一轮最优分配模拟,把「当前空闲 bot 的首个被分配 VIP」立即开工。
   * 返回是否有 VIP 真正开工(用于驱动 dispatch 循环重新评估)。
   */
  private dispatchVipRound(): boolean {
    const pendingVips = this.queue.vipPending;
    if (pendingVips.length === 0) return false;

    const now = this.clock.now();
    // 每个 bot 的模拟就绪时刻:空闲=now、忙碌=其当前任务预计完成时刻。
    const lanes = this.botList.map((bot) => ({
      bot,
      readyAt: bot.status === BotStatus.IDLE ? now : (bot.expectedFinishAt ?? now),
      assignedFirst: null as Order | null,
    }));
    if (lanes.length === 0) return false;

    for (const vip of pendingVips) {
      let best = lanes[0]!;
      for (const lane of lanes) {
        if (this.preferLane(lane, best)) best = lane;
      }
      if (best.assignedFirst === null) best.assignedFirst = vip;
      best.readyAt += best.bot.processingTime;
    }

    // 立即开工:当前真正空闲、且本轮分到首个 VIP 的 bot。
    const ready = lanes.find(
      (lane) => lane.bot.status === BotStatus.IDLE && lane.assignedFirst !== null,
    );
    if (!ready || !ready.assignedFirst) return false;
    this.queue.remove(ready.assignedFirst);
    this.startProcessing(ready.bot, ready.assignedFirst);
    return true;
  }

  /** 比较两条 lane 谁更适合接下一个 VIP:完成更早者优先;并列时偏好可立即开工者、再取较小 id。 */
  private preferLane(
    candidate: { bot: Bot; readyAt: number; assignedFirst: Order | null },
    best: { bot: Bot; readyAt: number; assignedFirst: Order | null },
  ): boolean {
    const candidateFinish = candidate.readyAt + candidate.bot.processingTime;
    const bestFinish = best.readyAt + best.bot.processingTime;
    if (candidateFinish !== bestFinish) return candidateFinish < bestFinish;

    // 完成时刻并列:优先「当前空闲且本轮尚未被占用」可立即开工的 bot。
    const candidateStartable =
      candidate.bot.status === BotStatus.IDLE && candidate.assignedFirst === null;
    const bestStartable = best.bot.status === BotStatus.IDLE && best.assignedFirst === null;
    if (candidateStartable !== bestStartable) return candidateStartable;
    return candidate.bot.id < best.bot.id;
  }

  private firstIdleBot(): Bot | null {
    return this.botList.find((bot) => bot.status === BotStatus.IDLE) ?? null;
  }

  private startProcessing(bot: Bot, order: Order): void {
    bot.assign(order, this.clock.now());
    order.markProcessing();
    this.emit({ kind: 'OrderPickedUp', at: this.clock.now(), orderId: order.id, botId: bot.id });

    const cancel = this.clock.setTimeout(() => this.complete(bot), bot.processingTime);
    this.timers.set(bot.id, cancel);
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
    processingTime: bot.processingTime,
  };
}
