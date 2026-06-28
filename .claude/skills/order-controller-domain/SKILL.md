---
name: order-controller-domain
description: The McDonald's cooking-bot order-controller domain rules and conventions used in this repo (immutable SystemState + reconcile, VIP/normal priority via a single sort key, configurable cooking time). Use when changing order or bot behaviour, or their tests.
---

# Order Controller — Domain Rules

Source of truth: `src/domain/orderSystem.ts` + `src/domain/types.ts`. All logic
is pure (no React, no real timers); `now` is always passed in.

## The rules (from the assignment)
1. New Normal order → PENDING.
2. New VIP order → PENDING, ahead of all Normal orders but behind earlier VIPs.
3. Order numbers are unique and increasing.
4. A bot cooks one order at a time; each takes 10s, then it moves to COMPLETE
   and the bot picks up the next order.
5. With nothing pending, a bot is IDLE.
6. Removing a bot destroys the **newest** one; if it was cooking, that order
   returns to its original priority position in PENDING.
7. Everything is in-memory.

## Key design conventions
- **One priority sort key** `(rank, id)` with `VIP=0, NORMAL=1` and increasing
  `id`. This single key satisfies both req 2 (VIP jumps the queue) and req 6 (a
  returned order keeps its id, so re-sorting restores its original slot). Don't
  track positions manually.
- **`reconcile(state, now, processMs)`** is the only state-transition engine:
  first complete any order cooked for `>= processMs` (set `completedAt =
  startedAt + processMs`) and free its bot, then assign idle bots the
  highest-priority pending orders. It returns the **same state reference** when
  nothing changed.
- **Actions reconcile immediately** so a new order/bot is acted on at once, not
  on the next tick.
- **`processMs` is configurable** (default 10000) via `?processMs=` — keep it
  injectable so tests stay fast and deterministic.

## Testing convention
Unit-test the pure functions by passing explicit `now` values — no fake timers.
Cover: numbering, VIP ordering, immediate pickup, completion at `processMs`,
next-order pickup, bot removal returning the order, idle-with-no-orders.

## When extending
Add new behaviour as pure functions over `SystemState` and reconcile after; keep
React in `src/hooks/useOrderSystem.ts` a thin wrapper. See
[[react-best-practices]].
