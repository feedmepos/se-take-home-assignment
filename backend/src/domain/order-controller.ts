import { Clock, Scheduler } from './time';
import { Order, Bot, OrderType, DomainEvent, StatusSnapshot } from './types';
import { compareOrders } from './priority';
import { BotNotFoundError } from './errors';

export const DEFAULT_COOK_MS = 10_000;

export class OrderController {
  private orders: Order[] = [];
  private bots: Bot[] = [];
  private timers = new Map<number, () => void>(); // botId -> cancel
  private nextOrderId = 1;
  private nextBotId = 1;
  private listeners = new Set<(e: DomainEvent) => void>();

  constructor(
    private readonly clock: Clock,
    private readonly scheduler: Scheduler,
    private readonly cookMs: number = DEFAULT_COOK_MS,
  ) {}

  addOrder(type: OrderType = 'NORMAL'): Order {
    const order: Order = { id: this.nextOrderId++, type, status: 'PENDING', createdAt: this.clock.now() };
    this.orders.push(order);
    this.emit({ type: 'OrderCreated', order, at: this.clock.now() });
    this.tryAssign();
    return order;
  }

  addBot(): Bot {
    const bot: Bot = { id: this.nextBotId++, status: 'IDLE', currentOrderId: null };
    this.bots.push(bot);
    this.emit({ type: 'BotAdded', botId: bot.id, at: this.clock.now() });
    this.tryAssign();
    return bot;
  }

  listBots(): Bot[] { return [...this.bots]; }

  removeBot(id?: number): Bot {
    if (this.bots.length === 0) throw new BotNotFoundError(id);
    const target = id === undefined
      ? this.bots.reduce((newest, b) => (b.id > newest.id ? b : newest))
      : this.bots.find((b) => b.id === id);
    if (!target) throw new BotNotFoundError(id);

    if (target.status === 'PROCESSING' && target.currentOrderId !== null) {
      this.timers.get(target.id)?.();
      this.timers.delete(target.id);
      const order = this.orders.find((o) => o.id === target.currentOrderId);
      if (order) {
        order.status = 'PENDING';
        this.emit({ type: 'OrderRequeued', orderId: order.id, botId: target.id, at: this.clock.now() });
      }
    }
    this.bots = this.bots.filter((b) => b.id !== target.id);
    this.emit({ type: 'BotRemoved', botId: target.id, at: this.clock.now() });
    this.tryAssign();
    return target;
  }

  listOrders(type?: OrderType): Order[] {
    return this.orders.filter((o) => !type || o.type === type);
  }

  snapshot(): StatusSnapshot {
    const pending = this.orders.filter((o) => o.status === 'PENDING').sort(compareOrders);
    const processing = this.bots
      .filter((b) => b.currentOrderId !== null)
      .map((b) => ({ order: this.orders.find((o) => o.id === b.currentOrderId)!, botId: b.id }));
    const complete = this.orders.filter((o) => o.status === 'COMPLETE');
    return { pending, processing, complete, bots: [...this.bots] };
  }

  subscribe(listener: (e: DomainEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(e: DomainEvent): void { for (const l of this.listeners) l(e); }

  private tryAssign(): void {
    for (const bot of this.bots) {
      if (bot.status !== 'IDLE') continue;
      const next = this.orders.filter((o) => o.status === 'PENDING').sort(compareOrders)[0];
      if (!next) { this.emit({ type: 'BotIdle', botId: bot.id, at: this.clock.now() }); continue; }
      next.status = 'PROCESSING';
      bot.status = 'PROCESSING';
      bot.currentOrderId = next.id;
      this.emit({ type: 'OrderStarted', orderId: next.id, botId: bot.id, at: this.clock.now() });
      const cancel = this.scheduler.schedule(this.cookMs, () => this.complete(bot.id, next.id));
      this.timers.set(bot.id, cancel);
    }
  }

  private complete(botId: number, orderId: number): void {
    const bot = this.bots.find((b) => b.id === botId);
    const order = this.orders.find((o) => o.id === orderId);
    this.timers.delete(botId);
    if (!bot || !order) return;
    order.status = 'COMPLETE';
    order.completedAt = this.clock.now();
    bot.status = 'IDLE';
    bot.currentOrderId = null;
    this.emit({ type: 'OrderCompleted', orderId, botId, at: this.clock.now() });
    this.tryAssign();
  }
}
