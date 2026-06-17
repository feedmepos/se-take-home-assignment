# PROGRESS.md

Living build log. Update this every slice: tick milestones, record decisions,
note any dependency added and why. This is the auditable trail of how the project
was built — keep it current and honest.

**Status:** Phase 0 + Phase 1 complete — pure core green, ready for the store bridge.
**Last updated:** 2026-06-18

---

## Milestones

### Phase 0 — Scaffold
- [x] `pnpm` Next.js 15 app, TS strict (+ `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- [x] Tailwind v4 + shadcn/ui initialised
- [x] Biome, Vitest, Playwright configured
- [x] `pnpm dev / build / typecheck / lint / test / e2e` all run

### Phase 1 — Core (pure domain)
- [x] `types.ts` — Order, Bot, Snapshot, discriminated-union statuses
- [x] `scheduler.ts` — Scheduler interface + systemScheduler
- [x] `queue.ts` — compareOrders, insertOrder, pickNext
- [x] `order-controller.ts` — commands, assign loop, immutable snapshots
- [x] Unit tests green — **entire must-pass list** in `patterns/testing.md` (19/19 tests: 9 queue + 10 controller)

### Phase 2 — Bridge
- [ ] `use-order-controller.ts` — useSyncExternalStore + selector hooks
- [ ] Stable-snapshot contract verified (no render loop)

### Phase 3 — UI
- [ ] controls / pending-column / complete-column / bot-shelf / order-card
- [ ] `countdown.tsx` isolated; board does not re-render on tick (DevTools check)
- [ ] VIP visually distinct; completedAt shown as HH:MM:SS; empty states

### Phase 4 — Verify & ship
- [ ] Full Definition of Done (see `CLAUDE.md` §7)
- [ ] Playwright happy path green
- [ ] Deployed to public Vercel URL: _link here_
- [ ] `README.md` written (run/test, design decisions, queue invariant, next steps)

---

## Decision log (ADR-lite)

> Append-only. Format: `YYYY-MM-DD — decision — rationale`.

- 2026-06-17 — Frontend option over backend CLI — plays to frontend strength;
  the assignment is inherently visual; core stays portable to a CLI if needed.
- 2026-06-17 — Queue kept sorted by `(tier, id)` — makes VIP placement and the
  `-Bot` re-insertion correct by construction; no manual index tracking.
- 2026-06-17 — `useSyncExternalStore` over Zustand for domain state — zero-dep,
  tear-free, keeps the controller as the single source of truth.
- 2026-06-17 — Scheduler injected into the core — deterministic tests, portable
  to CLI; core never touches globals.
- 2026-06-18 — Biome over ESLint for lint+format — single tool, single config,
  matches the pinned stack; default `create-next-app` ESLint config removed.
- 2026-06-18 — `formatClock` uses UTC getters (`getUTCHours` etc.) and Vitest is
  pinned to `TZ=UTC` — `completedAt` → `HH:MM:SS` is deterministic regardless of
  the machine running the tests.
- 2026-06-18 — Under `exactOptionalPropertyTypes`, optional fields (`Bot.currentOrderId`,
  `Bot.processingEndsAt`) are cleared by constructing a fresh object with only the
  keys that apply, never by spreading and setting the key to `undefined`.
- 2026-06-18 — `OrderController` tracks in-flight (PROCESSING) orders in a private
  `Map<orderId, Order>` outside `pending`/`complete` — keeps `Snapshot` honest
  (an order is in exactly one of the three buckets) while still letting `-Bot`
  reconstruct the exact order to re-insert via `insertOrder`.

## Dependencies added beyond the pinned stack

> None yet. Any addition must be justified here.

## Open questions for the interviewer

- Does "interactive CLI compulsory next round" apply to a frontend submission?
- Expectation on completion timestamps / audit in the UI?
- Countdown vs simple spinner preference?
