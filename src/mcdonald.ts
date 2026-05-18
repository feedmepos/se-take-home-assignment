type OrderType = 'vip' | 'normal';
type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE';

class Order {
  readonly id: number;
  readonly type: OrderType;
  private _status: OrderStatus = 'PENDING';

  constructor(id: number, type: OrderType) {
    this.id = id;
    this.type = type;
  }

  get status(): OrderStatus { return this._status; }

  start(): void { this._status = 'PROCESSING'; }
  complete(): void { this._status = 'COMPLETE'; }
  cancel(): void { this._status = 'PENDING'; }

  toSnapshot(): OrderSnapshot {
    return { id: this.id, type: this.type, status: this._status };
  }
}

// Injectable clock for real-time and simulated environments
interface Clock {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

const realClock: Clock = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

class Bot {
  readonly id: number;
  currentOrder: Order | null = null;
  private timer: unknown = null;
  private clock: Clock;

  constructor(id: number, clock: Clock = realClock) {
    this.id = id;
    this.clock = clock;
  }

  get status(): 'IDLE' | 'ACTIVE' {
    return this.currentOrder ? 'ACTIVE' : 'IDLE';
  }

  // Processes one order for 10 seconds, then invokes onCompletion
  startProcessing(order: Order, onCompletion: (order: Order) => void): void {
    this.currentOrder = order;
    order.start();
    this.timer = this.clock.setTimeout(() => {
      order.complete();
      this.currentOrder = null;
      this.timer = null;
      onCompletion(order);
    }, 10000);
  }

  // Stops processing, cancels timer, reverts order to PENDING
  stop(): Order | null {
    const order = this.currentOrder;
    if (this.timer) {
      this.clock.clearTimeout(this.timer);
      this.timer = null;
    }
    if (order) {
      order.cancel();
      this.currentOrder = null;
    }
    return order;
  }

  // Clears timer without touching order state (for shutdown)
  release(): void {
    if (this.timer) {
      this.clock.clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

type OrderSnapshot = { id: number; type: OrderType; status: OrderStatus };

type ManagerEvent =
  | { type: 'order_created'; order: OrderSnapshot }
  | { type: 'bot_created'; botId: number; status: string }
  | { type: 'bot_picked_up'; botId: number; order: OrderSnapshot }
  | { type: 'bot_completed'; botId: number; order: OrderSnapshot }
  | { type: 'bot_idle'; botId: number }
  | { type: 'bot_destroyed'; botId: number; order: OrderSnapshot | null };

class Manager {
  private pendingOrders: Order[] = [];
  private completedOrders: Order[] = [];
  private bots: Bot[] = [];
  private orderIdCounter = 999;
  private botIdCounter = 0;
  onEvent?: (event: ManagerEvent) => void;

  private emit(event: ManagerEvent): void {
    this.onEvent?.(event);
  }

  placeOrder(): number {
    const order = new Order(++this.orderIdCounter, 'normal');
    this.insertOrder(order);
    this.emit({ type: 'order_created', order: order.toSnapshot() });
    this.tryAssign();
    return order.id;
  }

  placeVipOrder(): number {
    const order = new Order(++this.orderIdCounter, 'vip');
    this.insertOrder(order);
    this.emit({ type: 'order_created', order: order.toSnapshot() });
    this.tryAssign();
    return order.id;
  }

  addBot(clock: Clock = realClock): number {
    const bot = new Bot(++this.botIdCounter, clock);
    this.bots.push(bot);
    this.emit({ type: 'bot_created', botId: bot.id, status: bot.status });
    this.tryAssign();
    return bot.id;
  }

  // LIFO: destroys the most recently added bot
  removeNewestBot(): number | null {
    const bot = this.bots.pop();
    if (!bot) return null;
    const order = bot.stop();
    this.emit({ type: 'bot_destroyed', botId: bot.id, order: order?.toSnapshot() ?? null });
    if (order) {
      this.insertOrder(order);
      this.tryAssign();
    }
    return bot.id;
  }

  // Destroys all bots, emitting events and returning in-progress orders to pending
  clearBots(): void {
    while (this.bots.length > 0) {
      const bot = this.bots.pop()!;
      const order = bot.stop();
      this.emit({ type: 'bot_destroyed', botId: bot.id, order: order?.toSnapshot() ?? null });
      if (order) this.insertOrder(order);
    }
  }

  release(): void {
    for (const bot of this.bots) bot.release();
  }

  get state() {
    const processing = this.bots.filter(b => b.currentOrder).map(b => b.currentOrder!);
    const pending = [...this.pendingOrders];
    const completed = [...this.completedOrders];
    const all = [...pending, ...processing, ...completed];
    return {
      pending,
      processing,
      completed,
      totalProcessed: all.length,
      vipTotal: all.filter(o => o.type === 'vip').length,
      normalTotal: all.filter(o => o.type === 'normal').length,
      completedCount: completed.length,
      activeBots: this.bots.length,
      pendingCount: pending.length,
    };
  }

  // VIP priority queue insertion:
  // VIP orders go before all normal orders; within same type, sorted by id ascending
  //
  // Performance analysis (pendingOrders: single array):
  //   insertOrder  — findIndex O(n) + splice O(n) = O(n)
  //   tryAssign    — shift O(n) (shifts all elements after removal)
  //   With n pending orders and m bots, worst-case O(n*m) per batch of operations.
  //
  // Improvement: use two deques (vipQueue + normalQueue):
  //   insertOrder  — push O(1) (orders are already sorted by id within each type)
  //   tryAssign    — shift from vip first, then normal = O(1)
  //   Reduces overall to O(1) amortized per operation.
  private insertOrder(order: Order): void {
    const pos = this.pendingOrders.findIndex(
      o => order.type === 'vip' && o.type === 'normal' || (order.type === o.type && order.id < o.id)
    );
    if (pos === -1) this.pendingOrders.push(order);
    else this.pendingOrders.splice(pos, 0, order);
  }

  // Assigns the next pending order to the first idle bot
  private tryAssign(): void {
    const idleBot = this.bots.find(b => b.status === 'IDLE');
    const nextOrder = this.pendingOrders[0];
    if (!idleBot || !nextOrder) return;
    this.pendingOrders.shift();
    this.emit({ type: 'bot_picked_up', botId: idleBot.id, order: nextOrder.toSnapshot() });
    idleBot.startProcessing(nextOrder, (order) => {
      this.emit({ type: 'bot_completed', botId: idleBot.id, order: order.toSnapshot() });
      this.completedOrders.push(order);
      if (this.pendingOrders.length === 0) {
        this.emit({ type: 'bot_idle', botId: idleBot.id });
      } else {
	this.tryAssign();
      }
    });
  }
}

export { Order, Manager, realClock };
export type { OrderType, OrderStatus, Clock, ManagerEvent };
