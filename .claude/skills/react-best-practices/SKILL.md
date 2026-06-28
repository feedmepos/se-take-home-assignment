---
name: react-best-practices
description: Best practices for building and changing React UIs in this repo — "Thinking in React" component decomposition, one-way data flow, single source of truth, deriving state instead of duplicating it, hooks discipline, and an accessibility/quality floor. Use when adding or refactoring React components or hooks.
---

# React Best Practices (Thinking in React)

There is no official Anthropic "Thinking in React" skill, so this is a compact,
project-tuned one. It encodes the conventions this codebase already follows.

## Thinking in React — the five steps
1. **Break the UI into a component hierarchy.** One component = one
   responsibility. Here: `ControlBar`, `OrderColumn` → `OrderCard`,
   `BotShelf` → `BotCard`.
2. **Build a static version first** — props flowing down, no state — then wire
   in interactivity.
3. **Find the minimal state.** For each piece of data ask: passed in via props?
   unchanging? *derivable from other state/props*? If yes to any, it is **not**
   state. Pending/complete/bot lists are derived, not stored.
4. **Decide where state lives** — the lowest common owner of everything that
   reads it. Here that owner is `useOrderSystem`.
5. **Add inverse data flow** — children invoke callbacks passed from the owner
   (`onNewNormal`, `onAddBot`, …); they never reach up.

## Single source of truth — derive, don't duplicate
Hold one authoritative state (`SystemState`) and compute views with pure
selectors (`pendingOrders`, `completeOrders`, `botsView`). Never copy derived
data into separate `useState`, and never use `useEffect` to keep two states "in
sync" — that is a duplicated-source bug waiting to happen.

## Keep logic out of components
Business rules live in framework-free modules with `now` injected
(`src/domain/orderSystem.ts`). Components only render and dispatch. This is what
makes the rules unit-testable without React or fake timers.

## Hooks discipline
- Obey the Rules of Hooks: call them at the top level, with honest dependency
  arrays.
- Use functional updates (`setState(s => next(s))`) whenever the next value
  depends on the previous one.
- **Always clean up** intervals/listeners/timeouts in the `useEffect` return.
- No side effects during render; derive with `useMemo`.
- Prefer one source of "time": a single interval ticks `now`; `reconcile`
  returns the **same reference** when nothing changed so idle ticks don't
  re-render.

## Lists & keys
Use stable, unique domain keys (`order.id`, `bot.id`). Never use the array
index as a key for lists that reorder — it corrupts state and animations.

## Props & types
Give every component an explicit `Props` interface. Model status as a
discriminated string union (`'PENDING' | 'PROCESSING' | 'COMPLETE'`) rather than
several booleans.

## Quality floor (don't skip)
- Accessibility: semantic roles/labels, visible `:focus-visible`, `aria-live`
  for values that change (the bot count).
- Respect `prefers-reduced-motion`.
- Responsive down to mobile.

## Anti-patterns to avoid
Duplicating derived data into state · `useEffect` that only mirrors props into
state · index keys on dynamic lists · 300-line components · logic buried in JSX
· effects without cleanup.
