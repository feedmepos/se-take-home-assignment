export type OrderType = 'NORMAL' | 'VIP';
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE';

export interface Order {
  id: number;
  type: OrderType;
  status: OrderStatus;
}

export type BotStatus = 'IDLE' | 'PROCESSING';
export type TimerHandle = ReturnType<typeof setTimeout>;

export interface Bot {
  id: number;
  status: BotStatus;
  currentOrder: Order | null;
  timer: TimerHandle | null;
}

export type ControllerEvent =
  | { type: 'ORDER_CREATED'; order: Order }
  | { type: 'BOT_CREATED'; bot: Bot }
  | { type: 'BOT_PICKED'; bot: Bot; order: Order }
  | { type: 'ORDER_COMPLETED'; bot: Bot; order: Order }
  | { type: 'BOT_IDLE'; bot: Bot }
  | { type: 'BOT_DESTROYED'; bot: Bot; returnedOrder: Order | null };

export type EventListener = (event: ControllerEvent) => void;

export interface OrderControllerOptions {
  processingMs?: number;
  setTimeoutFn?: (callback: () => void, ms: number) => TimerHandle;
  clearTimeoutFn?: (handle: TimerHandle) => void;
}

export class OrderController {
  readonly pending: Order[] = [];
  readonly completed: Order[] = [];
  readonly bots: Bot[] = [];

  private nextOrderId = 1000;
  private nextBotId = 0;

  private readonly processingMs: number;
  private readonly setTimeoutFn: (callback: () => void, ms: number) => TimerHandle;
  private readonly clearTimeoutFn: (handle: TimerHandle) => void;

  private readonly listeners: EventListener[] = [];

  constructor(options: OrderControllerOptions = {}) {
    this.processingMs = options.processingMs ?? 10_000;
    this.setTimeoutFn = options.setTimeoutFn ?? ((cb, ms) => setTimeout(cb, ms));
    this.clearTimeoutFn = options.clearTimeoutFn ?? ((h) => clearTimeout(h));
  }

  on(listener: EventListener): this {
    this.listeners.push(listener);
    return this;
  }

  private emit(event: ControllerEvent): void {
    for (const listener of this.listeners) listener(event);
  }

  private static rank(order: Order): number {
    return order.type === 'VIP' ? 0 : 1;
  }

  // VIP before Normal; within a tier, the earlier order id first (FIFO).
  private comesBefore(a: Order, b: Order): boolean {
    const ra = OrderController.rank(a);
    const rb = OrderController.rank(b);
    if (ra !== rb) return ra < rb;
    return a.id < b.id;
  }

  // Used by both newOrder and removeBot, so a returned order keeps its priority.
  private insert(order: Order): void {
    const i = this.pending.findIndex((existing) => this.comesBefore(order, existing));
    if (i === -1) this.pending.push(order);
    else this.pending.splice(i, 0, order);
  }

  newOrder(type: OrderType): Order {
    const order: Order = { id: ++this.nextOrderId, type, status: 'PENDING' };
    this.insert(order);
    this.emit({ type: 'ORDER_CREATED', order });
    this.dispatch();
    return order;
  }

  addBot(): Bot {
    const bot: Bot = { id: ++this.nextBotId, status: 'IDLE', currentOrder: null, timer: null };
    this.bots.push(bot);
    this.emit({ type: 'BOT_CREATED', bot });
    this.dispatch();
    return bot;
  }

  removeBot(): Bot | null {
    const bot = this.bots.pop();
    if (!bot) return null;

    let returnedOrder: Order | null = null;
    if (bot.status === 'PROCESSING' && bot.currentOrder) {
      if (bot.timer !== null) this.clearTimeoutFn(bot.timer); // cancel: avoid a phantom completion
      const order = bot.currentOrder;
      order.status = 'PENDING';
      this.insert(order);
      returnedOrder = order;
      bot.currentOrder = null;
      bot.timer = null;
      bot.status = 'IDLE';
    }

    this.emit({ type: 'BOT_DESTROYED', bot, returnedOrder });
    this.dispatch();
    return bot;
  }

  private dispatch(): void {
    for (const bot of this.bots) {
      if (bot.status !== 'IDLE') continue;
      if (this.pending.length === 0) break;

      const order = this.pending.shift()!;
      order.status = 'PROCESSING';
      bot.currentOrder = order;
      bot.status = 'PROCESSING';
      this.emit({ type: 'BOT_PICKED', bot, order });
      bot.timer = this.setTimeoutFn(() => this.complete(bot), this.processingMs);
    }
  }

  private complete(bot: Bot): void {
    const order = bot.currentOrder;
    if (!order) return;

    order.status = 'COMPLETE';
    this.completed.push(order);
    bot.currentOrder = null;
    bot.timer = null;
    bot.status = 'IDLE';
    this.emit({ type: 'ORDER_COMPLETED', bot, order });

    if (this.pending.length > 0) this.dispatch();
    else this.emit({ type: 'BOT_IDLE', bot });
  }

  isDrained(): boolean {
    return this.pending.length === 0 && this.bots.every((b) => b.status === 'IDLE');
  }
}
