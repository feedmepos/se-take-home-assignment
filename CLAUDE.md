# CLAUDE.md

Operational guide for working in this repo with Claude Code. This file owns
**how we work** (commands, architecture, workflow, guardrails). It does **not**
restate coding standards — those live in `AGENTS.md`. Area recipes live in
`.claude/patterns/`. Build state lives in `PROGRESS.md`.

> Read order before any task: this file → `AGENTS.md` → the relevant
> `.claude/patterns/*` → `PROGRESS.md`. Then plan, then implement.

---

## 1. What this is

An in-memory order controller for McDonald's automated cooking bots. Single
screen: orders flow `PENDING → COMPLETE`, VIP orders jump the queue, a manager
scales bots up/down live. No backend, no database, no persistence. Full spec in
`PRD.md`.

## 2. Stack (pinned, do not add to without a note in PROGRESS.md)

- Next.js 15 (App Router) · React 19 · TypeScript 5 (strict)
- Tailwind CSS v4 · shadcn/ui
- State bridge: React `useSyncExternalStore` (zero-dep). Zustand is allowed only
  if it earns its place — see `.claude/patterns/state-bridge.md`.
- Vitest (unit) · Playwright (E2E) · Biome (lint + format)
- pnpm · deploy on Vercel

The domain core has **no runtime dependencies** and no React/DOM imports.

## 3. Commands

```bash
pnpm dev          # local dev server
pnpm build        # production build (must pass clean)
pnpm typecheck    # tsc --noEmit (must pass clean)
pnpm lint         # biome check (must pass clean)
pnpm test         # vitest run (unit, fake timers)
pnpm test:watch   # vitest watch
pnpm e2e          # playwright test (happy-path)
```

## 4. Architecture map

```
src/
  core/                       # PURE domain — no React, no DOM, no globals
    types.ts                  # Order, Bot, Snapshot, discriminated-union statuses
    queue.ts                  # pure: compareOrders, insertOrder, pickNext
    scheduler.ts              # Scheduler interface + systemScheduler (injected)
    order-controller.ts       # single source of truth; emits immutable snapshots
  store/
    use-order-controller.ts   # useSyncExternalStore bridge + selectors
  components/
    controls.tsx              # New Normal / New VIP / +Bot / -Bot
    pending-column.tsx
    complete-column.tsx
    bot-shelf.tsx
    order-card.tsx
    countdown.tsx             # isolated ticking — never re-renders the board
  app/
    layout.tsx
    page.tsx                  # composition only; thin "use client" boundary
```

Module boundary is the real "code splitting" here: **core ⟂ bridge ⟂ UI**, each
independently testable and replaceable. The same `core/` powers a CLI unchanged
if a later round asks for one. Do **not** reach for `React.lazy`/dynamic import
on this board — it's too small to warrant it, and pretending otherwise is noise.

## 5. Workflow (the part we're showcasing)

1. **Plan first (Opus, plan mode).** Produce a written plan referencing `PRD.md`
   + patterns before editing code. No code in plan mode.
2. **Implement in vertical slices (Sonnet).** Order: `core` → its tests →
   `store` bridge → `components` → polish. Each slice ends green
   (typecheck + lint + test) before the next starts.
3. **Commit small & conventional.** One logical change per commit (see AGENTS.md).
   GitHub Flow: feature branch → PR into your fork.
4. **Update `PROGRESS.md` every slice.** Tick milestones, log decisions. This is
   the auditable trail — keep it honest and current.
5. **Verify before "done."** Run the full Definition of Done below.

## 6. Guardrails (hard rules)

- **No domain logic in components.** Components read snapshots and call
  controller methods. Nothing else. If a `.tsx` file contains a queue/sort/timer
  decision, it's in the wrong layer.
- **The core stays pure.** No `window`, `Date.now()`, or `setTimeout` reached
  directly — go through the injected `Scheduler`. This is what makes it testable
  and portable.
- **No new dependencies** without recording the reason in `PROGRESS.md`.
- **No persistence, no auth, no API.** In-memory only (PRD §2).
- **No over-engineering.** No branded types, no event-sourcing, no abstract
  factories. Clean and minimal beats clever. The scope is ~1 focused hour.
- **Never leak a timer.** Every scheduled completion must be cancellable; `-Bot`
  cancels in-flight work and returns the order (see core-domain pattern).

## 7. Definition of Done

- [ ] `pnpm typecheck` clean (strict, `noUncheckedIndexedAccess`)
- [ ] `pnpm lint` clean
- [ ] `pnpm test` green, incl. the must-pass list in `.claude/patterns/testing.md`
- [ ] `pnpm e2e` green (submit orders → bots process → land in COMPLETE)
- [ ] `pnpm build` clean
- [ ] No unnecessary re-renders (countdown isolated; verified in React DevTools)
- [ ] Deployed to a public Vercel URL
- [ ] `README.md` written: run/test instructions, design decisions, the queue
      invariant, and "what I'd add next"
- [ ] `PROGRESS.md` reflects final state
