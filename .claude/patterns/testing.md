# Pattern: Testing

Confidence comes from the core tests. The UI gets one honest happy-path E2E. No
real time waits anywhere.

## Unit (Vitest) — deterministic time

Use fake timers so 10s processing advances instantly and timestamps are stable:

```ts
import { beforeEach, afterEach, vi } from "vitest";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-17T09:00:00Z")); // deterministic completedAt
});
afterEach(() => vi.useRealTimers());

// advance one processing cycle:
vi.advanceTimersByTime(10_000);
```

The controller's default `systemScheduler` calls `setTimeout`/`Date.now`, both
faked here — no separate fake scheduler needed.

## Must-pass list (these are the assignment)

- [ ] New NORMAL order appends to the back of PENDING.
- [ ] New VIP order sits **behind existing VIPs, ahead of all NORMALs**.
- [ ] Order ids are unique and strictly increasing across both types.
- [ ] A bot processes the front order for exactly 10s, then it lands in COMPLETE.
- [ ] After completing, the bot picks the next pending order; goes IDLE when none.
- [ ] `+Bot` immediately consumes a pending order when one exists.
- [ ] **`-Bot` mid-process returns the in-flight order to its exact original
      position** (re-sorts by id) and cancels its timer (no leak).
- [ ] Two bots process two orders in parallel; no order is assigned twice.
- [ ] `completedAt` is set on completion and formats to `HH:MM:SS`.
- [ ] `getSnapshot()` returns a stable reference until state changes.

Test behaviour and invariants, not internals — assert the resulting snapshot,
not private fields.

## E2E (Playwright) — one happy path

Create a couple of normal + VIP orders, add a bot, assert VIP completes first and
both orders reach COMPLETE. Use Playwright's clock control or `expect.poll` rather
than fixed sleeps. Keep it to a single robust spec.
