import { dequeueHead, insertOrderAt } from "./queue";
import type { ActiveCook, Bot, KitchenSnapshot, Order } from "./types";

function sortBots(bots: Bot[]): Bot[] {
  return [...bots].sort((a, b) => a.id - b.id);
}

function cloneSnapshot(s: KitchenSnapshot): KitchenSnapshot {
  return {
    nextOrderId: s.nextOrderId,
    nextBotId: s.nextBotId,
    vip: [...s.vip],
    normal: [...s.normal],
    bots: s.bots.map((b) => ({
      ...b,
      cook: b.cook ? { ...b.cook, order: { ...b.cook.order } } : undefined,
    })),
    completed: [...s.completed],
  };
}

export function createInitialKitchen(): KitchenSnapshot {
  return {
    nextOrderId: 1,
    nextBotId: 0,
    vip: [],
    normal: [],
    bots: [],
    completed: [],
  };
}

/** Stable snapshot for SSR / hydration — must not allocate a new object per call. */
const SERVER_SNAPSHOT = createInitialKitchen();

export class KitchenModel {
  private snapshot: KitchenSnapshot;
  private readonly listeners = new Set<() => void>();
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private readonly processMs: number;

  constructor(processMs: number) {
    this.processMs = processMs;
    this.snapshot = createInitialKitchen();
  }

  subscribe = (onStoreChange: () => void): (() => void) => {
    this.listeners.add(onStoreChange);
    return () => {
      this.listeners.delete(onStoreChange);
    };
  };

  getSnapshot = (): KitchenSnapshot => this.snapshot;

  getServerSnapshot = (): KitchenSnapshot => SERVER_SNAPSHOT;

  private emit(): void {
    for (const l of this.listeners) {
      l();
    }
  }

  private commit(next: KitchenSnapshot): void {
    this.snapshot = next;
    this.emit();
  }

  private clearTimer(botId: number): void {
    const t = this.timers.get(botId);
    if (t !== undefined) {
      clearTimeout(t);
      this.timers.delete(botId);
    }
  }

  private scheduleFinish(botId: number, orderId: number): void {
    this.clearTimer(botId);
    const tid = setTimeout(() => {
      this.finishCook(botId, orderId);
    }, this.processMs);
    this.timers.set(botId, tid);
  }

  addNormalOrder(): void {
    const s = cloneSnapshot(this.snapshot);
    const o: Order = { id: s.nextOrderId, type: "NORMAL" };
    s.nextOrderId += 1;
    s.normal = [...s.normal, o];
    this.commit(s);
    this.assignAllIdle();
  }

  addVIPOrder(): void {
    const s = cloneSnapshot(this.snapshot);
    const o: Order = { id: s.nextOrderId, type: "VIP" };
    s.nextOrderId += 1;
    s.vip = [...s.vip, o];
    this.commit(s);
    this.assignAllIdle();
  }

  addBot(): void {
    const s = cloneSnapshot(this.snapshot);
    const id = s.nextBotId;
    s.nextBotId += 1;
    s.bots = sortBots([...s.bots, { id, status: "IDLE" }]);
    this.commit(s);
    this.tryAssignForBot(id);
  }

  removeNewestBot(): void {
    const s0 = this.snapshot;
    if (s0.bots.length === 0) {
      return;
    }
    const maxId = Math.max(...s0.bots.map((b) => b.id));
    const s = cloneSnapshot(s0);
    const idx = s.bots.findIndex((b) => b.id === maxId);
    if (idx < 0) {
      return;
    }
    const bot = s.bots[idx];
    if (bot.status === "PROCESSING" && bot.cook) {
      this.clearTimer(bot.id);
      const { order, tier, reinsertIdx } = bot.cook;
      if (tier === "VIP") {
        s.vip = insertOrderAt(s.vip, reinsertIdx, order);
      } else {
        s.normal = insertOrderAt(s.normal, reinsertIdx, order);
      }
    }
    s.bots.splice(idx, 1);
    s.bots = sortBots(s.bots);
    this.commit(s);
    this.assignAllIdle();
  }

  private finishCook(botId: number, orderId: number): void {
    const s0 = this.snapshot;
    const bot = s0.bots.find((b) => b.id === botId);
    if (!bot || bot.status !== "PROCESSING" || !bot.cook) {
      return;
    }
    if (bot.cook.order.id !== orderId) {
      return;
    }
    this.clearTimer(botId);
    const s = cloneSnapshot(s0);
    const b = s.bots.find((x) => x.id === botId);
    if (!b || !b.cook || b.cook.order.id !== orderId) {
      return;
    }
    s.completed = [...s.completed, b.cook.order];
    b.status = "IDLE";
    b.cook = undefined;
    this.commit(s);
    this.assignAllIdle();
  }

  private tryAssignForBot(botId: number): void {
    const s0 = this.snapshot;
    const bot = s0.bots.find((b) => b.id === botId);
    if (!bot || bot.status !== "IDLE" || bot.cook) {
      return;
    }
    if (s0.vip.length === 0 && s0.normal.length === 0) {
      return;
    }
    const s = cloneSnapshot(s0);
    const b = s.bots.find((x) => x.id === botId);
    if (!b || b.status !== "IDLE") {
      return;
    }
    const { vip, normal, tier, order, idx } = dequeueHead(s.vip, s.normal);
    s.vip = vip;
    s.normal = normal;
    const cook: ActiveCook = { order, tier, reinsertIdx: idx };
    b.status = "PROCESSING";
    b.cook = cook;
    this.commit(s);
    this.scheduleFinish(botId, order.id);
  }

  private assignAllIdle(): void {
    const ids = this.snapshot.bots.filter((b) => b.status === "IDLE").map((b) => b.id);
    for (const id of ids) {
      this.tryAssignForBot(id);
    }
  }

  destroy(): void {
    for (const id of this.timers.keys()) {
      this.clearTimer(id);
    }
  }
}
