// --------------------------------------------------------------------------
// Single source of truth. Emits immutable snapshots; all state lives here.
//
// Key design choices:
// - Time injected via Scheduler → unit-testable with vi.useFakeTimers()
// - getSnapshot() returns a stable reference → useSyncExternalStore safe
// - assign() is the whole scheduling loop; runs after every state change
// - removeBot() cancels the timer (no leak) and re-inserts the order via
//   insertOrder() so it sorts back to its exact original slot by id
// --------------------------------------------------------------------------

import { insertOrder, pickNext } from './queue';
import { type Scheduler, type TimerHandle, systemScheduler } from './scheduler';
import type {
  Bot,
  CompleteOrder,
  IdleBot,
  PendingOrder,
  ProcessingBot,
  ProcessingOrder,
  Snapshot,
} from './types';

/** How long a bot spends processing one order. */
const PROCESS_MS = 10_000;

interface InFlightEntry {
  readonly order: ProcessingOrder;
  readonly handle: TimerHandle;
}

export class OrderController {
  private nextOrderId = 1;
  private nextBotId = 1;

  // Internal mutable arrays — callers see only the immutable Snapshot.
  private pending: PendingOrder[] = [];
  private complete: CompleteOrder[] = [];
  private bots: Bot[] = [];

  // Live timer handles keyed by bot id; cleared on completion or bot removal.
  private inFlight = new Map<number, InFlightEntry>();

  // Cached snapshot; rebuilt in commit() after every state change.
  // Stable reference between transitions is the contract for useSyncExternalStore.
  private cachedSnapshot: Snapshot = this.buildSnapshot();
  private listeners = new Set<() => void>();

  constructor(private readonly scheduler: Scheduler = systemScheduler) {}

  /** Returns a stable snapshot reference until state actually changes. */
  getSnapshot(): Snapshot {
    return this.cachedSnapshot;
  }

  /** Subscribe to state changes. Returns unsubscribe function. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Add a normal (non-priority) order. Sorts to the back of pending. */
  addNormalOrder(): void {
    const order: PendingOrder = {
      id: this.nextOrderId++,
      type: 'NORMAL',
      status: 'PENDING',
      createdAt: this.scheduler.now(),
    };
    this.pending = insertOrder(this.pending, order);
    this.assign();
    this.commit();
  }

  /** Add a VIP order. Sorts ahead of all normals, behind existing VIPs. */
  addVipOrder(): void {
    const order: PendingOrder = {
      id: this.nextOrderId++,
      type: 'VIP',
      status: 'PENDING',
      createdAt: this.scheduler.now(),
    };
    this.pending = insertOrder(this.pending, order);
    this.assign();
    this.commit();
  }

  /** Create a new IDLE bot and immediately assign pending orders. */
  addBot(): void {
    const bot: IdleBot = { id: this.nextBotId++, status: 'IDLE' };
    this.bots = [...this.bots, bot];
    this.assign();
    this.commit();
  }

  /**
   * Destroy the newest (highest-id) bot.
   * If it was processing: cancel its timer (no leak) and re-insert the order
   * back into pending — insertOrder sorts it to its exact original slot.
   */
  removeBot(): void {
    if (this.bots.length === 0) return;

    // "Newest" = highest id
    const sorted = [...this.bots].sort((a, b) => b.id - a.id);
    const target = sorted[0];
    if (target === undefined) return;

    this.bots = this.bots.filter((b) => b.id !== target.id);

    if (target.status === 'PROCESSING') {
      const entry = this.inFlight.get(target.id);
      if (entry !== undefined) {
        // Cancel the timer before it fires — prevents a stray completion.
        this.scheduler.clearTimeout(entry.handle);
        this.inFlight.delete(target.id);

        // Return the order to pending; re-sorts to its original position by id.
        const returned: PendingOrder = {
          id: entry.order.id,
          type: entry.order.type,
          status: 'PENDING',
          createdAt: entry.order.createdAt,
        };
        this.pending = insertOrder(this.pending, returned);
      }
    }

    this.assign();
    this.commit();
  }

  // -------------------------------------------------------------------------
  // Private

  /**
   * The scheduling loop: while there is an IDLE bot AND a PENDING order,
   * pair them up, mark both PROCESSING, and start a 10s timer.
   * Must be called before commit() so the snapshot reflects final state.
   */
  private assign(): void {
    while (this.pending.length > 0 && this.hasIdleBot()) {
      const picked = pickNext(this.pending);
      if (picked === null) break;

      const idleBot = this.bots.find((b) => b.status === 'IDLE');
      if (idleBot === undefined) break;

      const { next: pendingOrder, rest } = picked;
      this.pending = rest;

      const processingOrder: ProcessingOrder = {
        id: pendingOrder.id,
        type: pendingOrder.type,
        status: 'PROCESSING',
        createdAt: pendingOrder.createdAt,
      };

      const endsAt = this.scheduler.now() + PROCESS_MS;
      const processingBot: ProcessingBot = {
        id: idleBot.id,
        status: 'PROCESSING',
        currentOrderId: pendingOrder.id,
        processingEndsAt: endsAt,
      };

      this.bots = this.bots.map((b) => (b.id === idleBot.id ? processingBot : b));

      // Capture botId in the closure so the callback targets the right bot.
      const botId = idleBot.id;
      const handle = this.scheduler.setTimeout(() => {
        this.finishOrder(botId);
      }, PROCESS_MS);

      this.inFlight.set(botId, { order: processingOrder, handle });
    }
  }

  /** Timer callback: order → COMPLETE, bot → IDLE, run assign again. */
  private finishOrder(botId: number): void {
    const entry = this.inFlight.get(botId);
    // Guard: bot could be removed between timer scheduling and firing.
    if (entry === undefined) return;

    this.inFlight.delete(botId);

    const completedOrder: CompleteOrder = {
      id: entry.order.id,
      type: entry.order.type,
      status: 'COMPLETE',
      createdAt: entry.order.createdAt,
      completedAt: this.scheduler.now(),
    };
    this.complete = [...this.complete, completedOrder];

    const idleBot: IdleBot = { id: botId, status: 'IDLE' };
    this.bots = this.bots.map((b) => (b.id === botId ? idleBot : b));

    this.assign();
    this.commit();
  }

  private hasIdleBot(): boolean {
    return this.bots.some((b) => b.status === 'IDLE');
  }

  private buildSnapshot(): Snapshot {
    // Array.from avoids the for-of iteration-protocol requirement on MapIterator
    const processing: ProcessingOrder[] = Array.from(this.inFlight.values()).map((e) => e.order);
    return {
      pending: this.pending,
      processing,
      complete: this.complete,
      bots: this.bots,
    };
  }

  /** Rebuild cached snapshot and notify all subscribers. */
  private commit(): void {
    this.cachedSnapshot = this.buildSnapshot();
    // Array.from converts the Set so for-of works regardless of TS target quirks
    for (const listener of Array.from(this.listeners)) {
      listener();
    }
  }
}
