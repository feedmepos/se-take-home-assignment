# CLAUDE.md

The single instruction file for this repo. Product behaviour lives in `PRD.md`;
everything else — stack, architecture, standards, performance, testing, and how
the build ships — lives here. Read `PRD.md`, then this, then plan, then build in
**one pass, one PR**.

## What this is

In-memory order controller for McDonald's cooking bots. One screen: orders flow
PENDING → COMPLETE, VIP jumps the queue, a manager scales bots live. No backend,
no database, no persistence. Full behaviour in `PRD.md`.

## Stack (pinned — adding a dependency needs a one-line reason in the PR)

Next.js 15 (App Router) · React 19 · TypeScript 5 strict · Tailwind v4 ·
shadcn/ui · Vitest · Playwright · Biome · pnpm · deploy on Vercel.
**The domain core has zero runtime dependencies and no React/DOM imports.**

## Commands

```
pnpm dev | build | typecheck | lint | test | e2e   # all must pass clean
```

## Architecture — the point of this assignment

One-directional layering, each layer independently testable:

```
core (pure)  →  store (bridge)  →  components (presentation)

src/
  core/                     # pure, no React/DOM/globals
    types.ts                # Order, Bot, Snapshot, discriminated-union statuses
    queue.ts                # compareOrders, insertOrder, pickNext
    scheduler.ts            # Scheduler interface + systemScheduler (injected)
    order-controller.ts     # single source of truth; emits immutable snapshots
    *.test.ts               # co-located unit tests
  store/
    use-order-controller.ts # useSyncExternalStore bridge + selector hooks
  components/
    controls.tsx  pending-column.tsx  complete-column.tsx
    bot-shelf.tsx  order-card.tsx  countdown.tsx
  app/
    layout.tsx  page.tsx     # composition only; thin "use client" boundary
```

Dependencies point one way only. Components import core **types** only; all
behaviour goes through the store. **No domain logic in a `.tsx` file, ever.**

### The invariant that runs everything

PENDING is always kept sorted by **(VIP before NORMAL, then ascending order id)**.
Because ids are monotonic, this single rule makes VIP placement, FIFO-within-tier,
and "return a cancelled order to its exact original slot" all correct *by
construction* — no index bookkeeping. **This is the scalability story:** a new
order type or priority rule is a change to one compare function and nothing else.

### Core rules (`src/core/`)

- Pure and deterministic. Time is injected via a `Scheduler` (default
  `systemScheduler` = `setTimeout`/`Date.now`); never touch globals directly.
  This is what makes the core unit-testable and CLI-portable.
- State transitions return **new** objects; never mutate in place.
- `getSnapshot()` returns a **stable reference** until state actually changes —
  otherwise `useSyncExternalStore` loops forever.
- `-Bot` destroys the **newest** bot (highest id); if it was processing, cancel
  its timer (no leak) and re-insert the order — it re-sorts to its original slot.
- Separate monotonic counters for order ids and bot ids; never reuse.

## Standards

- TypeScript strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`.
  No `any`, no non-null `!`, no stray `as`. Statuses are discriminated unions.
- Files `kebab-case`, one primary export. Types/Components `PascalCase`,
  functions `camelCase`.
- Comment the **why**, not the **what**; one-line TSDoc on public core methods.
- Conventional Commits, small and atomic; every commit builds green.

## Performance (top priority — keep it provably tight)

- Domain state via `useSyncExternalStore` with **selector** subscriptions: a
  column re-renders only when its slice changes (pairs with stable snapshots).
- The 10→0 countdown ticks in an isolated leaf (`countdown.tsx`) and **must never
  re-render the board**. The board re-renders only on real state transitions.
- Derive counts / seconds-left at the edge; never duplicate core state in React.
- Keys are stable ids, never array index.
- **No `React.lazy`/dynamic import on this board** — too small to benefit. The
  real "code splitting" is the module boundary plus a thin `"use client"` line.

## Testing

Vitest with fake timers (`vi.useFakeTimers()` + `vi.setSystemTime()`) so 10s
advances instantly and `completedAt` is deterministic. Must-pass:

- Normal appends to back; VIP behind VIPs / ahead of all Normals; ids unique + increasing.
- A bot processes the front order for 10s → COMPLETE → picks next → idle when empty.
- `+Bot` consumes a pending order immediately.
- **`-Bot` mid-process returns the order to its exact original slot and cancels
  the timer (no leak)** — the headline test.
- Two bots in parallel never double-assign one order.
- `completedAt` formats to `HH:MM:SS`; `getSnapshot()` reference is stable until change.

One Playwright happy path: create normal + VIP orders, add a bot, assert VIP
completes first and both reach COMPLETE (clock control / `expect.poll`, no sleeps).

## How it ships — one go, one PR

1. **Plan first** (no code).
2. **Implement on one branch**, in order: `core` → its tests → `store` bridge →
   `components` → polish. Keep it green between steps.
3. **Open ONE PR** into the fork; description covers approach + key decisions.
4. **Write `README.md`:** run/test steps, **the queue invariant**, design
   decisions, a short **AI-assisted workflow** section (plan-mode + these
   standards + single PR), and "what I'd add next".

### Done means

typecheck · lint · test · e2e · build all green · no needless re-renders
(DevTools-checked) · deployed public Vercel URL · README written · one clean PR.
