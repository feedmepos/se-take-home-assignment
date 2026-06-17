# PRD — McDonald's Automated Cooking Bot Order Controller

**Author:** Haikal Azim (Ekal)
**Context:** FeedMe Software Engineer take-home assignment
**Chosen option:** Frontend (Next.js + TypeScript), with a framework-agnostic core
**Target demo:** Live walkthrough during interview

---

## 1. Problem

McDonald's is introducing automated cooking bots to process orders. We need an
**order controller** that manages the flow of orders from submission to
completion, honouring VIP priority and letting a manager scale bots up and down
in real time. No persistence — everything lives in memory for this prototype.

## 2. Goals / Non-goals

**Goals**
- Visually demonstrate every requirement in a single screen (PENDING, COMPLETE, bots, controls).
- Correct queue ordering: VIP ahead of Normal, FIFO within each tier.
- Correct bot lifecycle: pick up → 10s process → complete → pick next → idle.
- Correct, safe bot teardown that returns an in-flight order to its rightful place.
- Clean separation between domain logic and UI so the core is unit-tested and reusable (e.g. for a CLI).

**Non-goals**
- No auth, no database, no backend API, no payments.
- No multi-restaurant / multi-tenant concerns.
- No real kitchen integration. Keep it to ~1 hour of focused build; do not over-engineer.

## 3. Core domain model

```
Order {
  id: number            // unique, monotonically increasing, never reused
  type: "VIP" | "NORMAL"
  status: "PENDING" | "PROCESSING" | "COMPLETE"
  createdAt: number     // epoch ms
  completedAt?: number  // epoch ms, set on completion
}

Bot {
  id: number            // unique, increasing; "newest" = highest id
  status: "IDLE" | "PROCESSING"
  currentOrderId?: number
  processingEndsAt?: number   // epoch ms, drives the countdown UI
}
```

## 4. The key insight (queue ordering)

The PENDING queue is **always** sorted by a single composite key:

> **(VIP before NORMAL), then (ascending order id)**

Because order ids are monotonic and assigned at creation time, this one rule
satisfies every ordering requirement automatically:

- **New Normal order** → highest id, lowest priority → sorts to the back. ✓
- **New VIP order** → highest id among VIPs, but VIP tier outranks all Normals →
  sorts behind existing VIPs and ahead of every Normal. ✓
- **Cancelled order returned to the queue** (after a bot is removed) → it simply
  re-enters and re-sorts to its *original* position, because its id hasn't
  changed. No manual index bookkeeping needed. ✓

This is the heart of the assignment and the thing to get provably right with tests.

## 5. The assignment loop

A single `assign()` step runs after **every** state change (new order, +bot,
-bot, processing completion):

> While there is an IDLE bot AND a PENDING order: take the front of the queue,
> mark the order PROCESSING, mark the bot PROCESSING, start a 10s timer.

On timer completion: order → COMPLETE (stamp `completedAt`), bot → IDLE, run `assign()` again.

## 6. Requirements → behaviour mapping

| # | Requirement | Implementation |
|---|-------------|----------------|
| 1 | New Normal → PENDING | append; sorts to back of queue |
| 2 | New VIP → ahead of Normals, behind VIPs | sort key (VIP, id) handles it |
| 3 | Unique increasing order number | single counter, never decremented/reused |
| 4 | +Bot processes pending, 10s, → COMPLETE, then next | add IDLE bot, run `assign()`, 10s timer per order |
| 5 | No pending → bot IDLE | `assign()` leaves bot IDLE when queue empty |
| 6 | -Bot destroys newest; in-flight order returns to original position | remove highest-id bot; if PROCESSING, cancel timer, set order back to PENDING (re-sorts by id), run `assign()` |
| 7 | No persistence | all state in memory |

## 7. Architecture

```
src/
  core/                       # PURE domain — no React, no DOM, no globals
    types.ts                  # Order, Bot, Snapshot, discriminated-union statuses
    queue.ts                  # pure: compareOrders, insertOrder, pickNext
    scheduler.ts              # Scheduler interface + systemScheduler (injected)
    order-controller.ts       # single source of truth; emits immutable snapshots
    # unit tests co-located:  queue.test.ts, order-controller.test.ts
  store/
    use-order-controller.ts   # useSyncExternalStore bridge + selectors
  components/
    controls.tsx              # New Normal / New VIP / +Bot / -Bot
    pending-column.tsx
    complete-column.tsx
    bot-shelf.tsx             # IDLE / PROCESSING; processing bot hosts a Countdown
    order-card.tsx            # order #, VIP/NORMAL badge, status, completedAt (HH:MM:SS)
    countdown.tsx             # isolated ticking — never re-renders the board
  app/
    layout.tsx
    page.tsx                  # composition only; thin "use client" boundary
```

**Why a pure `OrderController` class as the single source of truth:**
- Trivially unit-testable without React or waiting 10 real seconds (time is
  injected via a `Scheduler` — see CLAUDE.md → Core rules).
- Framework-agnostic → the *same* file can back a CLI if the next round needs one.
- Clean domain/UI boundary = the senior-level talking point.

> All implementation guidance — stack, architecture, standards, performance, and
> testing — lives in the single `CLAUDE.md`. This PRD owns **product behaviour**;
> `CLAUDE.md` owns the **how**. File naming is **kebab-case** throughout.

Default to `useSyncExternalStore` for domain state (zero-dep, tear-free, keeps the
controller the single source of truth). Reach for Zustand only for UI-only
ephemeral state (e.g. a selected-card highlight) — never for domain state. The
hard rule either way: **logic never lives in components.**

## 8. UI / UX

- Three regions on one screen: **Controls** (top), **PENDING** and **COMPLETE**
  columns (main), **Bot shelf** (side or bottom).
- Order card shows: order #, VIP/Normal badge, status. Completed cards show
  completion time in **HH:MM:SS** (parity with the backend spec; nice for the demo).
- Processing order/bot shows a live countdown (10 → 0). It lives in an isolated
  leaf component (`countdown.tsx`) with its own interval, so ticking never
  re-renders the PENDING/COMPLETE board — the board re-renders only on real state
  transitions.
- Buttons disabled when meaningless (e.g. -Bot when zero bots).
- Light, playful styling consistent with your portfolio palette is fine; keep it clean.

## 9. Testing strategy

**Unit (Vitest)** with `vi.useFakeTimers()` + `vi.setSystemTime()` so 10s
processing advances instantly and `completedAt` is deterministic. The core's
injected `Scheduler` uses `setTimeout`/`Date.now`, both faked — no separate fake
scheduler needed. Must-pass list:

- New Normal appends to back.
- New VIP inserts ahead of all Normals, behind existing VIPs.
- Order ids strictly increasing and unique.
- One bot processes one order in 10s, then picks the next; idle when queue empties.
- +Bot immediately consumes a pending order.
- **-Bot mid-process returns the order to its exact original position** and cancels
  its timer (no leak) — the headline test.
- Multiple bots process in parallel; no double-assignment of one order.
- `completedAt` is set on completion and formats to `HH:MM:SS`.
- `getSnapshot()` returns a stable reference until state changes.

**E2E (Playwright)** — one happy path: create normal + VIP orders, add a bot,
assert VIP completes first and both reach COMPLETE. Use clock control / `expect.poll`,
not fixed sleeps.

## 10. Deployment

- Host on **Vercel** (public URL) — your existing setup.
- Code lives in the forked repo per submission instructions.
- README: how to run locally, how to test, design decisions, and the queue-ordering insight.

## 11. Open questions for the interviewer

1. Does the "interactive CLI compulsory next round" note apply if I submit the
   frontend option? (Drives how hard I lean on the portable core now.)
2. Any expectation for completion timestamps / per-order audit in the frontend UI?
3. Preference on showing the processing countdown vs. a simple spinner?

## 12. Out-of-scope ideas (mention, don't build)

Persistence, real concurrency/locking, configurable processing time, order
cancellation by customer, bot failure/retry. Note them in the README as "what I'd
add next" — shows product thinking without burning the hour.
