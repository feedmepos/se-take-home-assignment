type OrderType = 'normal' | 'vip';
type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE';
type BotStatus = 'IDLE' | 'ACTIVE';

class Order {
  readonly id: number;
  readonly type: OrderType;
  status: OrderStatus = 'PENDING';

  constructor(id: number, type: OrderType) {
    this.id = id;
    this.type = type;
  }
}

class Bot {
  readonly id: number;
  status: BotStatus = 'IDLE';
  currentOrder: Order | null = null;

  constructor(id: number) {
    this.id = id;
  }
}

class Orders {
  private vipQueue: Order[] = [];
  private normalQueue: Order[] = [];

  add(order: Order): void {
    const queue = order.type === 'vip' ? this.vipQueue : this.normalQueue;
    queue.push(order);
  }

  remove(order: Order): void {
    const queue = order.type === 'vip' ? this.vipQueue : this.normalQueue;
    const idx = queue.indexOf(order);
    if (idx !== -1) queue.splice(idx, 1);
  }

  assignNext(): Order | null {
    const vip = this.vipQueue.find(o => o.status === 'PENDING');
    if (vip) return vip;
    return this.normalQueue.find(o => o.status === 'PENDING') ?? null;
  }

  get size(): number {
    let count = 0;
    for (const o of this.vipQueue) if (o.status === 'PENDING') count++;
    for (const o of this.normalQueue) if (o.status === 'PENDING') count++;
    return count;
  }

  get vipOrders(): Order[] {
    return this.vipQueue.filter(o => o.status === 'PENDING');
  }

  get normalOrders(): Order[] {
    return this.normalQueue.filter(o => o.status === 'PENDING');
  }

  getAll(): Order[] {
    return [...this.vipOrders, ...this.normalOrders];
  }
}

type OrderCallback = (order: Order) => void;
type OrderBotCallback = (order: Order, bot: Bot) => void;
type BotCallback = (bot: Bot) => void;

interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

const realClock: Clock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

class OrderController {
  private orders = new Orders();
  private bots: Bot[] = [];
  private completedOrders: Order[] = [];
  private orderIdCounter = 1000;
  private botIdCounter = 0;
  private timers: Map<number, unknown> = new Map();

  private orderCreatedCb?: OrderCallback;
  private orderProcessingCb?: OrderBotCallback;
  private orderCompletedCb?: OrderBotCallback;
  private botCreatedCb?: BotCallback;
  private botDestroyedCb?: BotCallback;
  private botIdleCb?: BotCallback;

  readonly clock: Clock;

  constructor(clock: Clock = realClock) {
    this.clock = clock;
  }

  get pendingOrders(): Order[] {
    return this.orders.getAll();
  }

  get completedOrderList(): Order[] {
    return [...this.completedOrders];
  }

  get botList(): Bot[] {
    return [...this.bots];
  }

  get nextOrderId(): number {
    return this.orderIdCounter + 1;
  }

  onOrderCreated(cb: OrderCallback): void { this.orderCreatedCb = cb; }
  onOrderProcessing(cb: OrderBotCallback): void { this.orderProcessingCb = cb; }
  onOrderCompleted(cb: OrderBotCallback): void { this.orderCompletedCb = cb; }
  onBotCreated(cb: BotCallback): void { this.botCreatedCb = cb; }
  onBotDestroyed(cb: BotCallback): void { this.botDestroyedCb = cb; }
  onBotIdle(cb: BotCallback): void { this.botIdleCb = cb; }

  addOrder(type: OrderType): Order {
    const order = new Order(++this.orderIdCounter, type);
    this.orders.add(order);
    this.orderCreatedCb?.(order);
    this.tryAssignIdleBot();
    return order;
  }

  addBot(): Bot {
    const bot = new Bot(++this.botIdCounter);
    this.bots.push(bot);
    this.botCreatedCb?.(bot);
    this.tryAssignOrder(bot);
    return bot;
  }

  removeBot(id: number): Bot | null {
    const idx = this.bots.findIndex(b => b.id === id);
    if (idx === -1) return null;
    const bot = this.bots.splice(idx, 1)[0];
    this.botDestroyedCb?.(bot);
    if (bot.status === 'ACTIVE' && bot.currentOrder) {
      const timer = this.timers.get(bot.id);
      if (timer) {
        this.clock.clearTimeout(timer);
        this.timers.delete(bot.id);
      }
      bot.currentOrder.status = 'PENDING';
      bot.currentOrder = null;
      bot.status = 'IDLE';
    }
    return bot;
  }

  removeNewestBot(): Bot | null {
    if (this.bots.length === 0) return null;
    return this.removeBot(this.bots[this.bots.length - 1].id);
  }

  destroy(): void {
    for (const timer of this.timers.values()) {
      this.clock.clearTimeout(timer);
    }
    this.timers.clear();
  }

  private tryAssignIdleBot(): void {
    const idleBot = this.bots.find(b => b.status === 'IDLE');
    if (idleBot && this.orders.size > 0) {
      this.tryAssignOrder(idleBot);
    }
  }

  private tryAssignOrder(bot: Bot): void {
    const order = this.orders.assignNext();
    if (!order) return;
    order.status = 'PROCESSING';
    bot.status = 'ACTIVE';
    bot.currentOrder = order;
    this.orderProcessingCb?.(order, bot);
    const timer = this.clock.setTimeout(() => this.completeOrder(bot), 10000);
    this.timers.set(bot.id, timer);
  }

  private completeOrder(bot: Bot): void {
    const order = bot.currentOrder!;
    order.status = 'COMPLETE';
    this.orders.remove(order);
    this.completedOrders.push(order);
    this.timers.delete(bot.id);
    this.orderCompletedCb?.(order, bot);
    bot.currentOrder = null;
    if (this.orders.size > 0) {
      this.tryAssignOrder(bot);
    } else {
      bot.status = 'IDLE';
      this.botIdleCb?.(bot);
    }
  }
}

export { Order, Bot, Orders, OrderController };
export type { OrderType, OrderStatus, BotStatus, Clock };
