# Pattern: Core Domain (`src/core/`)

The core is the assignment. Get it provably right; everything else is a view
over it. **No React, no DOM, no globals. Pure, deterministic, portable.**

## The one invariant that runs the whole thing

The PENDING queue is **always kept sorted** by a single composite key:

```
priority(VIP) < priority(NORMAL)        // VIP tier first
then ascending order.id                 // FIFO within a tier (ids are monotonic)
```

Because ids are monotonic and assigned at creation, this single rule satisfies
every ordering requirement *for free*:

- New NORMAL → highest id, lower tier → lands at the back.
- New VIP → highest id among VIPs, but VIP tier outranks all NORMALs → lands
  behind existing VIPs, ahead of every NORMAL.
- A cancelled order (after `-Bot`) re-enters and **re-sorts to its exact original
  position**, because its id never changed. No manual index tracking — this is
  why the hardest requirement (PRD §6) becomes trivial.

```ts
// queue.ts — keep these pure and exhaustively tested
const tier = (o: Order) => (o.type === "VIP" ? 0 : 1);

export function compareOrders(a: Order, b: Order): number {
  return tier(a) - tier(b) || a.id - b.id;
}

export function insertOrder(queue: readonly Order[], order: Order): Order[] {
  return [...queue, order].sort(compareOrders); // sorted-by-construction
}

export function pickNext(queue: readonly Order[]): Order | undefined {
  return queue[0]; // front is always the highest-priority pending order
}
```

## Time is injected, never reached for

The core must be deterministic in tests and reusable in a CLI. Never call
`Date.now()` or `setTimeout` directly — depend on a `Scheduler`.

```ts
// scheduler.ts
export type CancelTimer = () => void;

export interface Scheduler {
  now(): number;
  schedule(callback: () => void, delayMs: number): CancelTimer;
}

export const systemScheduler: Scheduler = {
  now: () => Date.now(),
  schedule: (cb, ms) => {
    const id = setTimeout(cb, ms);
    return () => clearTimeout(id);
  },
};
```

`OrderController` takes a `Scheduler` in its constructor (defaulting to
`systemScheduler`). Tests pass the system scheduler under Vitest fake timers; a
CLI passes the real one. Same core, three environments.

## The controller is the single source of truth

```ts
const PROCESS_MS = 10_000;

export class OrderController {
  constructor(scheduler?: Scheduler);

  // commands (mutations) — each ends by running assign() and notifying
  addNormalOrder(): void;
  addVipOrder(): void;
  addBot(): void;
  removeBot(): void;          // destroys newest bot (highest id)

  // read side
  getSnapshot(): Snapshot;    // STABLE reference — see below
  subscribe(listener: () => void): () => void;
}
```

### The assignment loop — runs after every mutation and every completion

> While an IDLE bot and a PENDING order both exist: take `pickNext`, mark order
> PROCESSING + bot PROCESSING, schedule completion in `PROCESS_MS`, store the
> returned `CancelTimer` on the bot.

On completion: order → COMPLETE (stamp `completedAt = scheduler.now()`), bot →
IDLE, clear its timer handle, run `assign()` again.

### `-Bot` (the requirement most likely to break live)

1. Select the **newest** bot (highest id).
2. If it's PROCESSING: call its `CancelTimer` (no leaked timer), set the order
   back to PENDING (`completedAt` untouched, stays undefined), `insertOrder` it —
   it re-sorts to its original slot automatically.
3. Remove the bot. Run `assign()` — a surviving idle bot may pick the order up.

## Immutable snapshots (this prevents a real React bug)

`getSnapshot()` must return the **same reference** until state actually changes.
Build a new frozen snapshot object only inside mutations; `getSnapshot()` returns
the cached one. Returning a freshly-constructed object on every call makes
`useSyncExternalStore` loop forever.

```ts
interface Snapshot {
  readonly pending: readonly Order[];
  readonly complete: readonly Order[];
  readonly bots: readonly Bot[];
}
```

## Guardrails

- Order id and bot id come from separate monotonic counters; never reuse.
- Mutations produce new state objects; never mutate arrays/objects in place.
- All side effects (timers) are owned by the controller and always cancellable.
- No logging, no I/O, no env access in this folder.
