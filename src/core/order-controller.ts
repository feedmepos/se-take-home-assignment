import { insertOrder, pickNext } from "./queue";
import { type CancelTimer, type Scheduler, systemScheduler } from "./scheduler";
import type { Bot, Order, Snapshot } from "./types";

const PROCESS_MS = 10_000;

/** Single source of truth for orders, bots, and the assignment loop. */
export class OrderController {
  private readonly scheduler: Scheduler;
  private pending: Order[] = [];
  private complete: Order[] = [];
  private bots: Bot[] = [];
  private nextOrderId = 1;
  private nextBotId = 1;
  private readonly listeners = new Set<() => void>();
  private readonly timers = new Map<number, CancelTimer>();
  private readonly inFlight = new Map<number, Order>();
  private snapshot: Snapshot;

  constructor(scheduler: Scheduler = systemScheduler) {
    this.scheduler = scheduler;
    this.snapshot = this.buildSnapshot();
  }

  /** Creates a new NORMAL order and runs the assignment loop. */
  addNormalOrder(): void {
    this.addOrder("NORMAL");
  }

  /** Creates a new VIP order and runs the assignment loop. */
  addVipOrder(): void {
    this.addOrder("VIP");
  }

  /** Creates an order of the given type, inserts it into PENDING, and runs the assignment loop. */
  private addOrder(type: Order["type"]): void {
    const order: Order = {
      id: this.nextOrderId++,
      type,
      status: "PENDING",
      createdAt: this.scheduler.now(),
    };
    this.pending = insertOrder(this.pending, order);
    this.assign();
    this.commit();
  }

  /** Adds a new IDLE bot and runs the assignment loop. */
  addBot(): void {
    const bot: Bot = { id: this.nextBotId++, status: "IDLE" };
    this.bots = [...this.bots, bot];
    this.assign();
    this.commit();
  }

  /** Destroys the newest bot (highest id); a processing order returns to PENDING at its original slot. */
  removeBot(): void {
    if (this.bots.length === 0) return;
    const newest = this.bots.reduce((a, b) => (b.id > a.id ? b : a));

    if (newest.status === "PROCESSING" && newest.currentOrderId !== undefined) {
      this.cancelTimer(newest.id);
      const inFlightOrder = this.inFlight.get(newest.currentOrderId);
      if (inFlightOrder) {
        this.inFlight.delete(inFlightOrder.id);
        const returned: Order = { ...inFlightOrder, status: "PENDING" };
        this.pending = insertOrder(this.pending, returned);
      }
    }

    this.bots = this.bots.filter((b) => b.id !== newest.id);
    this.assign();
    this.commit();
  }

  /** Returns the current snapshot. Stable reference until state actually changes. */
  getSnapshot(): Snapshot {
    return this.snapshot;
  }

  /** Subscribes to state changes; returns an unsubscribe function. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** While an IDLE bot and a PENDING order both exist, assigns the front order to that bot. */
  private assign(): void {
    while (true) {
      const idleBot = this.bots.find((b) => b.status === "IDLE");
      const nextOrder = pickNext(this.pending);
      if (!idleBot || !nextOrder) break;

      this.pending = this.pending.filter((o) => o.id !== nextOrder.id);
      const processingOrder: Order = { ...nextOrder, status: "PROCESSING" };
      this.inFlight.set(processingOrder.id, processingOrder);

      const endsAt = this.scheduler.now() + PROCESS_MS;
      this.bots = this.bots.map((b) =>
        b.id === idleBot.id
          ? {
              id: b.id,
              status: "PROCESSING" as const,
              currentOrderId: processingOrder.id,
              processingEndsAt: endsAt,
            }
          : b,
      );

      const cancel = this.scheduler.schedule(
        () => this.completeOrder(idleBot.id),
        PROCESS_MS,
      );
      this.timers.set(idleBot.id, cancel);
    }
  }

  /** Marks the bot's in-flight order COMPLETE, frees the bot, and runs the assignment loop. */
  private completeOrder(botId: number): void {
    const bot = this.bots.find((b) => b.id === botId);
    if (!bot || bot.currentOrderId === undefined) return;

    const order = this.inFlight.get(bot.currentOrderId);
    this.inFlight.delete(bot.currentOrderId);
    this.timers.delete(botId);

    if (order) {
      const completedOrder: Order = {
        ...order,
        status: "COMPLETE",
        completedAt: this.scheduler.now(),
      };
      this.complete = [...this.complete, completedOrder];
    }

    this.bots = this.bots.map((b) =>
      b.id === botId ? { id: b.id, status: "IDLE" as const } : b,
    );

    this.assign();
    this.commit();
  }

  /** Cancels and forgets the in-flight completion timer for the given bot, if any. */
  private cancelTimer(botId: number): void {
    const cancel = this.timers.get(botId);
    if (cancel) {
      cancel();
      this.timers.delete(botId);
    }
  }

  /** Rebuilds the cached snapshot and notifies subscribers. */
  private commit(): void {
    this.snapshot = this.buildSnapshot();
    this.notify();
  }

  /** Constructs a fresh snapshot object from current internal state. */
  private buildSnapshot(): Snapshot {
    return {
      pending: this.pending,
      complete: this.complete,
      bots: this.bots,
    };
  }

  /** Calls every subscribed listener. */
  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}
