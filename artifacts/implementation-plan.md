# Implementation Plan: McDonald's KDS Dashboard

## Overview

**Tech Stack:** Next.js 14+ (App Router), React 18+, TypeScript, CSS Modules  
**Runtime:** In-memory state only — no database, no external API, no persistence  
**Deployment:** Vercel (free tier)  
**Architecture:** Single-page dashboard with all logic in a single custom hook (`useKitchenState`). The hook holds order/bot state, exposes action functions, and runs a `setInterval`-based processing loop that advances orders through PENDING → PROCESSING → COMPLETE.

### Design Principles

- **KISS (Keep It Simple, Stupid):** One hook for all state, one component per UI concern, no unnecessary abstractions. No Redux, no context providers, no third-party state libraries.
- **DRY (Don't Repeat Yourself):** Order number formatting, VIP priority sorting, and elapsed-time calculation are pure utility functions — defined once, imported everywhere.
- **Short files:** No file exceeds ~100 lines. Each component does one thing. The hook is the largest file (~80 lines of reducer logic) but remains a single concern.
- **Good React practice:** `useReducer` over `useState` for complex state; `useEffect` cleanup for interval; derived data (sorted arrays) computed from state, not stored; components receive only the props they need.

### Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State container | Single `useReducer` hook | Centralized, predictable state transitions; easy to reason about for a 1-hour prototype |
| Processing timer | `setInterval` at 200ms tick | Meets the ≤200ms progress bar update requirement; simpler than `requestAnimationFrame` or per-bot `setTimeout` chains |
| VIP priority enforcement | Sorted array on every render | PENDING orders are kept sorted: VIPs first (by `createdAt`), then Normals (by `createdAt`). No complex data structure needed for ≤200 orders |
| Bot-to-order assignment | Lazy evaluation each tick | Each tick, idle bots scan the sorted PENDING array; no pre-assignment, no race conditions |
| Order number wrapping | Modulo 10000, display padded to 4 digits | `((counter - 1) % 10000) + 1` → wraps 9999→0001; padding via `.toString().padStart(4, '0')` |
| Bot ID permanence | Global incrementing counter, never reused | Bot IDs are sequential integers (1, 2, 3…). Removing Bot 3 then adding yields Bot 4 |

---

## Phase 0: Shared Contracts (ALWAYS FIRST)

Before any implementation, freeze these:

- **TypeScript interfaces** for `Order`, `Bot`, and `KitchenState`
- **Constants** for processing duration, tick interval, order number format
- **Action types** for the reducer

### Contracts to Create

1. `src/types.ts` — All shared TypeScript interfaces and type aliases
2. `src/constants.ts` — Magic numbers and configuration values

### Contract Specifications

#### `src/types.ts`

```typescript
// ---- Enums / Union Types ----

export type OrderType = 'VIP' | 'NORMAL';
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE';
export type BotStatus = 'IDLE' | 'PROCESSING';

// ---- Domain Models ----

export interface Order {
  /** Unique identifier for React keys and programmatic reference (UUID v4) */
  id: string;
  /** Display number: 4-digit padded, auto-incrementing, wraps at 9999→0001 */
  orderNumber: number;
  type: OrderType;
  status: OrderStatus;
  /** Unix timestamp (ms) of submission; used for FIFO ordering within tier */
  createdAt: number;
  /** Timestamp when bot picked up the order (ms since epoch); null if not processing */
  processingStartedAt: number | null;
  /** Which bot is processing this order; null if not processing */
  processingBotId: number | null;
}

export interface Bot {
  /** Permanent, never-reused integer ID */
  id: number;
  status: BotStatus;
  /** ID of the order this bot is currently processing; null if idle */
  currentOrderId: string | null;
}

// ---- State Shape ----

export interface KitchenState {
  orders: Order[];
  bots: Bot[];
  /** Global order sequence counter; increments on every order (Normal or VIP) */
  orderIdCounter: number;
  /** Global bot ID counter; increments on every +Bot, never decrements */
  botIdCounter: number;
  /** Incremented on every TICK to guarantee React re-renders even when no state transitions occur */
  tickCounter: number;
}

// ---- Hook Return Type ----

export interface KitchenStateReturn {
  state: KitchenState;
  pendingOrders: Order[];    // Sorted: VIPs by createdAt, then NORMALs by createdAt
  processingOrders: Order[]; // All orders with status PROCESSING
  completedOrders: Order[];  // All orders with status COMPLETE, in completion order
  addNormalOrder: () => void;
  addVipOrder: () => void;
  addBot: () => void;
  removeBot: () => void;
}

// ---- Reducer Actions ----

export type KitchenAction =
  | { type: 'ADD_NORMAL_ORDER' }
  | { type: 'ADD_VIP_ORDER' }
  | { type: 'ADD_BOT' }
  | { type: 'REMOVE_BOT' }
  | { type: 'TICK'; now: number };
```

#### `src/constants.ts`

```typescript
/** Duration a bot takes to process one order, in milliseconds */
export const PROCESSING_TIME_MS = 10_000;

/** Interval for the processing engine tick, in milliseconds */
export const TICK_INTERVAL_MS = 200;

/** Maximum order number before counter wraps to 0001 */
export const ORDER_NUMBER_WRAP = 9_999;

/** Display width for order numbers (zero-padded) */
export const ORDER_NUMBER_PADDING = 4;
```

---

## Phase 1: Core State Management Hook

**Depends on:** Phase 0 (Contracts)  
**Can parallelize with:** Nothing (all subsequent phases depend on this)

### Goal

Deliver a fully functional `useKitchenState` hook that manages all order and bot state, enforces VIP priority, and runs the 10-second processing engine — all testable via console logging before any UI exists.

### Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useKitchenState.ts` | Reducer + custom hook with all business logic |

### Implementation Steps

1. **Create the reducer function** — `kitchenReducer(state: KitchenState, action: KitchenAction): KitchenState`
   - Handle `ADD_NORMAL_ORDER`: push new Order with `type: 'NORMAL'`, status `PENDING`, increment `orderIdCounter`
   - Handle `ADD_VIP_ORDER`: push new Order with `type: 'VIP'`, status `PENDING`, increment `orderIdCounter`
   - Handle `ADD_BOT`: push new Bot with `status: 'IDLE'`, increment `botIdCounter`; then in the same reducer call, assign the bot to the highest-priority PENDING order (see step 2)
   - Handle `REMOVE_BOT`: find newest bot (highest `id`), if it has `currentOrderId`, reset that order to `PENDING` status with `processingStartedAt: null` and `processingBotId: null`; remove the bot from the array
   - Handle `TICK`: always return a new state reference (increment `tickCounter`) so React re-renders even when no order transitions occur. Then: for each processing order, check if `now - processingStartedAt >= PROCESSING_TIME_MS`; if so, move to `COMPLETE` and free its bot; then for each idle bot, assign the highest-priority PENDING order

2. **Implement the `getHighestPriorityPendingOrder` helper** — pure function that takes `Order[]` and returns the order with:
   - Status `PENDING`
   - VIP orders sorted before NORMAL orders
   - Within each tier, sorted by `createdAt` ascending (oldest first)
   - Returns `undefined` if no PENDING orders exist

3. **Implement order number wrapping** — `generateOrderNumber(counter: number): number`:
   - Formula: `((counter - 1) % ORDER_NUMBER_WRAP) + 1`
   - Display as `.toString().padStart(ORDER_NUMBER_PADDING, '0')`

4. **Implement `useKitchenState` hook**:
   - Initialize state with `useReducer(kitchenReducer, initialState)`
   - Run `setInterval` at `TICK_INTERVAL_MS` that dispatches `{ type: 'TICK', now: Date.now() }`
   - Clean up interval on unmount
   - Return `{ state, addNormalOrder, addVipOrder, addBot, removeBot }` action dispatchers
   - Provide derived data: `pendingOrders`, `processingOrders`, `completedOrders` (pre-sorted arrays from state)

5. **Edge case handling in the reducer**:
   - `REMOVE_BOT` when `bots.length === 0`: no-op (return state unchanged)
   - `ADD_BOT` when PENDING is empty: bot spawns idle, picks up next order when it arrives (handled by `TICK`)
   - `TICK` when no bots exist: still increment `tickCounter` and return new state reference (guarantees progress bar updates)
   - `TICK` when a bot is processing: check elapsed time, move to COMPLETE if >= 10s
   - Returned order (from bot removal) re-enters PENDING at its original priority position automatically because `pendingOrders` is a **derived sorted view** — it filters orders with `status === 'PENDING'` and sorts by VIP-first then `createdAt` ascending. Since the returned order retains its original `createdAt`, the sort places it correctly without additional logic.

### Verification Gate

- [ ] TypeScript compiles cleanly: `npx tsc --noEmit`
- [ ] Unit checks via console (temporary `page.tsx`):
  - Dispatch `ADD_NORMAL_ORDER` → order appears in `pendingOrders` with status PENDING
  - Dispatch `ADD_VIP_ORDER` → VIP order appears before Normal orders in `pendingOrders`
  - Dispatch `ADD_BOT` → bot count increments, if PENDING has orders, top-priority order moves to PROCESSING
  - Wait 10 seconds → processing order moves to COMPLETE, bot picks up next order
  - Dispatch `REMOVE_BOT` → newest bot removed; its processing order (if any) returns to PENDING at correct priority
  - Order numbers increment correctly and wrap at 9999→0001

---

## Phase 2: UI Components

**Depends on:** Phase 1 (useKitchenState hook)  
**Can parallelize with:** Nothing (needs the hook for data)

### Goal

Build all React components that render the dashboard — order columns, order cards, progress bars, bot controls, and order submission buttons. The dashboard is functionally complete at the end of this phase.

### Files to Create

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Root page: imports and renders `<Dashboard />` |
| `src/app/layout.tsx` | Root layout: imports `globals.css`, sets up HTML document structure |
| `src/components/OrderCard.tsx` | Single order ticket: displays order number, type badge, progress bar (if processing) |
| `src/components/ProgressBar.tsx` | Animated progress bar: 0–100% fill over 10s |
| `src/components/OrderColumn.tsx` | Column wrapper: title, count badge, list of OrderCards |
| `src/components/BotControls.tsx` | +Bot / -Bot buttons, bot count display, per-bot status list |
| `src/components/OrderControls.tsx` | "New Normal Order" and "New VIP Order" buttons |
| `src/components/Dashboard.tsx` | Composes all sub-components into the dashboard layout |

### Implementation Steps

#### 2a. OrderCard Component

1. Create `src/components/OrderCard.tsx`
2. Props: `order: Order`, `progress?: number` (0–100, only passed when status is PROCESSING)
3. Render:
   - Order number (e.g., `#1001`) prominently
   - Type badge: "VIP" (gold/amber styling) or "NORMAL" (neutral styling)
   - If `order.status === 'PROCESSING'`: render `<ProgressBar percent={progress} />`
   - Status label (PENDING / PROCESSING / COMPLETE)

#### 2b. ProgressBar Component

1. Create `src/components/ProgressBar.tsx`
2. Props: `percent: number` (0–100)
3. Render a div with a child div whose `width` is set to `{percent}%`
4. Include a CSS transition on width for visual smoothness between ticks
5. Optionally show the remaining seconds as text (e.g., "8s left")

#### 2c. OrderColumn Component

1. Create `src/components/OrderColumn.tsx`
2. Props: `title: string`, `orders: Order[]`, `processingProgress?: Map<string, number>` (for PROCESSING column)
3. Render:
   - Column header with title and count badge
   - Scrollable list of `<OrderCard>` components
   - Empty state message when `orders.length === 0`

#### 2d. BotControls Component

1. Create `src/components/BotControls.tsx`
2. Props: `bots: Bot[]`, `onAddBot: () => void`, `onRemoveBot: () => void`, `processingOrders: Order[]` (only orders currently being processed, for per-bot status display)
3. Render:
   - Bot count display (e.g., "Bots: 3")
   - "+ Bot" button (always enabled)
   - "- Bot" button (disabled when `bots.length === 0`)
   - Per-bot status list: "Bot 1 — Idle", "Bot 2 — Processing #1004"

#### 2e. OrderControls Component

1. Create `src/components/OrderControls.tsx`
2. Props: `onNewNormalOrder: () => void`, `onNewVipOrder: () => void`
3. Render:
   - "New Normal Order" button
   - "New VIP Order" button
   - Both always enabled

#### 2f. Dashboard Component

1. Create `src/components/Dashboard.tsx`
2. Uses `useKitchenState()` hook
3. Calculates processing progress: for each order in `processingOrders`, compute `percent = (Date.now() - order.processingStartedAt!) / PROCESSING_TIME_MS * 100`, clamped to 0–100
4. Renders:
   - Header row with title "McDonald's KDS" + `<BotControls>` + `<OrderControls>`
   - Three `<OrderColumn>` components: PENDING, PROCESSING, COMPLETE
   - Pass appropriate `orders` arrays to each column

### Verification Gate

- [ ] `npx tsc --noEmit` — No TypeScript errors
- [ ] `npm run dev` — Page loads without console errors
- [ ] Click "New Normal Order" → order card appears in PENDING column
- [ ] Click "New VIP Order" → VIP card appears above Normal cards in PENDING
- [ ] Click "+ Bot" → bot spawns, picks up highest-priority PENDING order, moves to PROCESSING column
- [ ] Observe progress bar fills over 10 seconds
- [ ] After 10s → order moves to COMPLETE column
- [ ] Click "- Bot" on a processing bot → order returns to PENDING at correct priority position
- [ ] "- Bot" with 0 bots → button is disabled, no error
- [ ] 20+ orders → all columns scroll independently, no layout breakage
- [ ] Browser tab loses focus → return after 5s, progress bar reflects real elapsed time
- [ ] 200 orders stress test → generate 200 orders (via rapid clicking or console), verify all columns scroll smoothly, progress bars update without jank, bot pickup latency under 500ms, no layout breakage

---

## Phase 3: Styling & Polish

**Depends on:** Phase 2 (UI Components)  
**Can parallelize with:** Nothing

### Goal

Apply CSS Modules styling to achieve a clean, professional KDS dashboard appearance. Desktop-optimized layout (min 1024px viewport).

### Files to Create/Modify

| File | Purpose |
|------|---------|
| `src/app/globals.css` | CSS reset, CSS custom properties (design tokens), base typography |
| `src/components/Dashboard.module.css` | Dashboard grid layout, header styling |
| `src/components/OrderColumn.module.css` | Column layout, scrollable container, header styling |
| `src/components/OrderCard.module.css` | Card styling, type badges (VIP gold, Normal grey), status colors |
| `src/components/ProgressBar.module.css` | Bar container, fill animation, color transitions |
| `src/components/BotControls.module.css` | Button styling, bot list layout |
| `src/components/OrderControls.module.css` | Button styling for order submission |

### Implementation Steps

1. **Set up CSS custom properties** in `globals.css`:
   - Colors: `--color-vip` (gold/amber), `--color-normal` (neutral), `--color-pending` (yellow), `--color-processing` (blue), `--color-complete` (green), `--color-bg` (dark kitchen theme or clean light)
   - Spacing scale, border radius, font stack
   - Recommend a dark theme for KDS authenticity (black/dark background, high-contrast text)

2. **Dashboard layout** — CSS Grid: header row + 3 equal columns below
3. **OrderCard** — Card with subtle shadow/border, type badge (pill shape, VIP = gold, Normal = grey)
4. **ProgressBar** — Thin bar with colored fill (green→yellow→green gradient), `transition: width 200ms linear` for smooth animation
5. **Buttons** — Distinct styling for each action type (normal order, VIP order, +Bot, -Bot)
6. **Column scroll** — Each column is independently scrollable with `overflow-y: auto`

### Verification Gate

- [ ] `npm run build` — Production build succeeds with no CSS warnings
- [ ] Dashboard renders correctly at 1024px, 1440px, and 1920px viewport widths
- [ ] VIP cards visually distinct from Normal cards
- [ ] Progress bar animates smoothly (no jank, no single-frame jumps)
- [ ] Buttons have clear hover/active states
- [ ] Columns scroll independently when content overflows

---

## Phase 4: Vercel Deployment

**Depends on:** Phase 3 (Styling & Polish)  
**Can parallelize with:** Nothing

### Goal

Deploy the KDS dashboard to Vercel free tier and verify the publicly accessible URL works correctly.

### Implementation Steps

1. Push code to GitHub repository
2. Connect repository to Vercel (import project)
3. Configure: Framework = Next.js, Build Command = `npm run build`, Output Directory = `.next`
4. Deploy
5. Verify the public URL loads and all interactions work
6. Test on Chrome, Firefox, Safari, and Edge (latest desktop versions)

### Verification Gate

- [ ] Public URL loads in under 2 seconds (desktop, 4G)
- [ ] All acceptance criteria from US-1 through US-6 pass on the deployed instance
- [ ] No console errors in any browser
- [ ] Page refresh resets all state (orders, bots back to zero)

---

## Dependency Graph

```
Phase 0 (Types + Constants)
  │
  └── Phase 1 (useKitchenState Hook)
        │
        └── Phase 2 (UI Components)
              │
              └── Phase 3 (Styling & Polish)
                    │
                    └── Phase 4 (Vercel Deploy)
```

**All phases are sequential.** This is a small single-page app with tight coupling between state and UI. No phases can run in parallel.

---

## Testing Strategy

### Framework Choice

Per the project specification, **no automated testing framework is required** for the frontend path. The brief explicitly states testing is out of scope for the frontend option. However, the following verification approach is recommended:

### Manual Verification by Phase

Each phase includes a **Verification Gate** checklist. The implementer should pass all checks before advancing to the next phase.

### Key Flows to Manually Test (Pre-Deploy)

1. **Order submission flow:** Submit 5 Normal orders → all appear in PENDING in order. Submit 3 VIP orders → they jump ahead of Normals but queue behind earlier VIPs.
2. **VIP priority enforcement:** With 2 Normal orders waiting and 0 bots, submit a VIP order. Add a bot → VIP is picked up first.
3. **Bot processing lifecycle:** Add 1 bot, submit 3 orders → watch each process for 10s and move to COMPLETE.
4. **Bot removal mid-processing:** Add 1 bot, submit 1 order, wait 3 seconds, remove bot → order returns to PENDING with reset progress.
5. **Bot removal order:** Add 3 bots. Remove one → Bot 3 is removed (not Bot 1 or 2).
6. **Zero-bot edge case:** Start with 0 bots, submit orders → they stay in PENDING. "- Bot" is disabled.
7. **Order number wrapping:** Create 9999+ orders programmatically (or mock the counter) → verify wrap to 0001.
8. **Tab loss during processing:** Start an order processing, switch tabs for 8 seconds, return → progress bar shows ~80%.

### Browser Compatibility Testing

- Chrome (latest) — primary development browser
- Firefox (latest)
- Safari (latest)
- Edge (latest)

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Timer drift / setInterval not firing exactly at 200ms** | Medium | Low | Use `Date.now()` for elapsed time calculation, not tick-counting. Progress is based on wall-clock time, not accumulated ticks. |
| **React re-render performance with 200+ orders** | Low | Medium | Keep the reducer pure and fast (O(n) scans acceptable for ≤200 orders). If needed, memoize `pendingOrders`/`processingOrders`/`completedOrders` with `useMemo`. |
| **Stale closure in setInterval callback** | Medium | High | The `TICK` action carries `now: Date.now()` as payload; the reducer reads it fresh. Alternative: use `useRef` for the latest state and read it inside the interval. |
| **Order number collision after 9999→0001 wrap** | Low | Low | The counter wraps but order objects are tracked by `id` (UUID). Display collisions at 0001 are acceptable (the old #0001 is long since COMPLETE). |
| **`-Bot` button race condition** | Low | Medium | Reducer is synchronous and single-threaded in JS; each dispatch is atomic. The "newest bot" rule uses `Math.max(...bots.map(b => b.id))` which is deterministic. |
| **CSS Grid layout breaks at non-standard viewports** | Low | Low | Target 1024px minimum. Use `min-width` constraints and `overflow: auto` on columns. Test at 1024, 1440, 1920. |
| **Vercel free tier cold start** | Medium | Low | Acceptable for prototype. First load may take 2–3s; subsequent loads are cached. |
| **setInterval continues after unmount (memory leak)** | Low | High | Return cleanup function from `useEffect` that calls `clearInterval`. Verified by strict mode double-mount in React 18 dev. |
