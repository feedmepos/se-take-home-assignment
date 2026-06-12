# Implementation Plan Summary: McDonald's KDS Dashboard

## Phase Count & Dependencies

**4 sequential phases** (no parallelization possible for this tightly-coupled SPA):

```
Phase 0 (Contracts) → Phase 1 (State Hook) → Phase 2 (UI Components) → Phase 3 (Styling) → Phase 4 (Deploy)
```

| Phase | Name | Files Created | Depends On |
|-------|------|--------------|------------|
| 0 | Shared Contracts | `src/types.ts`, `src/constants.ts` | Nothing |
| 1 | State Management Hook | `src/hooks/useKitchenState.ts` | Phase 0 |
| 2 | UI Components | 6 component files | Phase 1 |
| 3 | Styling & Polish | 7 CSS Module files + `globals.css` | Phase 2 |
| 4 | Vercel Deployment | None (config only) | Phase 3 |

**Total files to create: 15**

## Key Decisions

- **All state in a single `useReducer`** — one hook (`useKitchenState`) owns orders, bots, and the processing engine. This avoids distributed state bugs and keeps the 1-hour scope achievable.
- **200ms tick-based processing loop** via `setInterval` — simpler than per-bot `setTimeout` chains, meets the ≤200ms progress bar smoothness requirement, and uses `Date.now()` for wall-clock accuracy (survives tab blur).
- **Sorted PENDING array on every render** — VIPs before Normals, each tier FIFO by `createdAt`. O(n) sort of ≤200 items is negligible.
- **Bot removal is LIFO** (newest bot first) — implemented as "find bot with highest `id`" in the reducer.
- **Order counter wraps at 9999→0001** — display formatting via `.padStart(4, '0')`; programmatic identity via UUID.
- **No external dependencies** beyond Next.js/React — no state management libraries, no UI frameworks, no animation libraries.

## Testing Approach

**Manual verification only** — the project brief explicitly excludes automated testing for the frontend path. Each phase has a verification gate (checklist of manual tests). Key flows to test:

1. Order submission (Normal + VIP priority interleaving)
2. Bot add/remove lifecycle (idle bot removal, mid-processing bot removal with order return)
3. 10-second processing with smooth progress bar
4. Edge cases: 0 bots, tab blur, rapid button clicks, 50+ orders

## Items for User Review Before Proceeding

1. **Type definitions** (`src/types.ts`) — Are the `Order`, `Bot`, `KitchenState`, and `KitchenAction` interfaces complete? Any missing fields?
2. **Dark theme vs. light theme** — The plan recommends a dark KDS-style theme. Confirm preference.
3. **Component granularity** — The plan proposes 6 components (OrderCard, ProgressBar, OrderColumn, BotControls, OrderControls, Dashboard). Is this the right level of decomposition for a ~1-hour build?
4. **Single-hook architecture** — All logic in `useKitchenState` with `useReducer`. Is this acceptable, or would you prefer separate hooks for orders vs. bots?
5. **No automated tests** — The brief says tests are optional for frontend. Should we add even basic smoke tests (e.g., a Playwright script) or stick to the brief?
6. **Order number format** — Displays as 4-digit zero-padded (`#0001`, `#1001`). Confirm format.
