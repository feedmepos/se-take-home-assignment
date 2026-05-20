# Technical Specification: McDonald's Order Controller
**Project:** FeedMe Take-Home Assignment — Order Control Flow  
**Framework:** Next.js 16 (App Router)  
**Document Version:** 1.0  
**Last Updated:** 2026-05-19

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture](#3-system-architecture)
4. [Data Models](#4-data-models)
5. [State Management Design](#5-state-management-design)
6. [Core Business Logic](#6-core-business-logic)
7. [UI Component Structure](#7-ui-component-structure)
8. [Implementation Phases](#8-implementation-phases)
9. [Test Scenarios](#9-test-scenarios)
10. [File & Folder Structure](#10-file--folder-structure)

---

## 1. Project Overview

### 1.1 Summary

Build a single-page, client-side web application that simulates McDonald's automated cooking order management system. The app allows staff to:

- Submit normal and VIP customer orders
- Add or remove cooking bots that process orders
- Observe orders transitioning from PENDING → COMPLETE in real time

There is **no backend** and **no data persistence** required. All state lives entirely in browser memory for the duration of the session.

### 1.2 Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-1 | Clicking "New Normal Order" adds an order to the PENDING queue at the end of the normal order section |
| FR-2 | Clicking "New VIP Order" adds an order to the PENDING queue, placed after all existing VIP orders but before all normal orders |
| FR-3 | Each order has a globally unique, auto-incrementing order number (starting from 1) |
| FR-4 | Clicking "+ Bot" creates a new bot that immediately picks up the first PENDING order and processes it over 10 seconds, then moves the order to COMPLETE |
| FR-5 | After completing an order, a bot automatically picks up the next PENDING order if one exists |
| FR-6 | If no PENDING orders remain, the bot becomes IDLE until a new order arrives |
| FR-7 | Clicking "- Bot" destroys the most recently created bot. If it was processing an order, that order is returned to its original position in the PENDING queue (respecting VIP/Normal priority) |
| FR-8 | A bot can only hold and process one order at a time |

### 1.3 Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-1 | No server-side logic; all processing happens in client memory |
| NFR-2 | No data persistence across page reloads |
| NFR-3 | UI must update in real time as bots process orders |
| NFR-4 | Each order takes exactly 10 seconds to process |
| NFR-5 | Code must be clean, readable, and well-structured |
| NFR-6 | Application must be deployable to a publicly accessible URL |

---

## 2. Technology Stack

### 2.1 Core Framework

| Tool | Version | Purpose |
|------|---------|---------|
| Next.js | 16.x | App framework (App Router) |
| React | 19.x (bundled with Next 16) | UI rendering |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Styling |

**Next.js 16 notes relevant to this project:**
- Uses the **App Router** (`app/` directory) by default
- **Turbopack** is the default bundler — no configuration needed
- **React Compiler** is stable in Next 16 — components are auto-memoized, reducing the need for manual `useMemo`/`useCallback`
- `middleware.ts` has been **replaced by `proxy.ts`** in Next 16 (not needed for this project since there's no routing logic)
- All state in this project is **client-side only** — no Server Components, no `use cache`, no route handlers needed

### 2.2 State Management

Use React's built-in `useReducer` hook with a **single global store** passed via Context. This avoids external dependencies while keeping state transitions explicit and testable. No Redux, Zustand, or other libraries are needed.

### 2.3 Tooling

| Tool | Purpose |
|------|---------|
| `create-next-app` | Project scaffolding |
| ESLint | Linting (Next 16 ships without `next lint`; use `eslint` directly) |
| Prettier | Code formatting |

### 2.4 Deployment

Deploy to **Vercel** (recommended for Next.js) or any static/SSR host (Netlify, Cloudflare Pages). Since this is a fully client-side app, any static host works.

---

## 3. System Architecture

### 3.1 High-Level Overview

```
┌─────────────────────────────────────────┐
│              Browser (Client)           │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │        React UI Layer           │    │
│  │  - Control Panel (buttons)      │    │
│  │  - Pending Queue display        │    │
│  │  - Complete Queue display       │    │
│  │  - Bot Status display           │    │
│  └──────────────┬──────────────────┘    │
│                 │ dispatch()            │
│  ┌──────────────▼──────────────────┐    │
│  │     useReducer (AppStore)       │    │
│  │  - orders[]                     │    │
│  │  - bots[]                       │    │
│  │  - orderCounter                 │    │
│  └──────────────┬──────────────────┘    │
│                 │                       │
│  ┌──────────────▼──────────────────┐    │
│  │       Bot Scheduler             │    │
│  │  (useEffect + setTimeout)       │    │
│  │  - Assign idle bots to orders   │    │
│  │  - Trigger COMPLETE after 10s   │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

### 3.2 Data Flow

```
User clicks "New VIP Order"
        │
        ▼
dispatch({ type: 'ADD_ORDER', payload: { isVip: true } })
        │
        ▼
Reducer inserts order into pending queue
(after last VIP, before first Normal)
        │
        ▼
useEffect detects idle bots + pending orders
        │
        ▼
dispatch({ type: 'ASSIGN_ORDER', botId, orderId })
        │
        ▼
setTimeout(10000) fires
        │
        ▼
dispatch({ type: 'COMPLETE_ORDER', botId, orderId })
        │
        ▼
Bot becomes IDLE → loop continues
```

---

## 4. Data Models

All types are defined in `src/types/index.ts`.

### 4.1 Order

```typescript
type OrderStatus = 'pending' | 'processing' | 'complete';
type OrderType = 'normal' | 'vip';

interface Order {
  id: number;           // Unique auto-incrementing order number (e.g. 1, 2, 3)
  type: OrderType;      // 'vip' | 'normal'
  status: OrderStatus;  // 'pending' | 'processing' | 'complete'
  createdAt: number;    // Date.now() timestamp — used for tie-breaking within same type
}
```

### 4.2 Bot

```typescript
type BotStatus = 'idle' | 'processing';

interface Bot {
  id: number;              // Unique bot ID, auto-incrementing (e.g. 1, 2, 3)
  status: BotStatus;       // 'idle' | 'processing'
  currentOrderId: number | null; // The order this bot is currently processing
}
```

### 4.3 AppState

```typescript
interface AppState {
  orders: Order[];     // All orders (pending, processing, complete) in one flat array
  bots: Bot[];         // All currently active bots
  orderCounter: number; // Monotonically increasing counter for order IDs
  botCounter: number;   // Monotonically increasing counter for bot IDs
}
```

**Design note:** Keeping all orders in a single flat array and deriving `pendingOrders`, `processingOrders`, `completedOrders` through selectors keeps the reducer simple. Selectors are pure functions with no side effects.

---

## 5. State Management Design

### 5.1 Reducer Actions

All actions are defined in `src/store/actions.ts`:

```typescript
type Action =
  | { type: 'ADD_ORDER'; payload: { isVip: boolean } }
  | { type: 'ASSIGN_ORDER'; payload: { botId: number; orderId: number } }
  | { type: 'COMPLETE_ORDER'; payload: { botId: number; orderId: number } }
  | { type: 'ADD_BOT' }
  | { type: 'REMOVE_BOT' };
```

### 5.2 Reducer Logic (per action)

**`ADD_ORDER`**

1. Increment `orderCounter`
2. Create new `Order` with `status: 'pending'`, `type` based on `isVip`
3. Insert into `orders` array:
   - If VIP: insert after the last existing VIP order with `status: 'pending'`, before the first Normal order with `status: 'pending'`
   - If Normal: append to the end of the array (it naturally falls after all VIP orders)
4. Return new state

> **VIP Insertion Logic:** Find the index of the last pending VIP order in the queue. Insert the new VIP order at `lastVipIndex + 1`. If no pending VIP orders exist, insert at position 0 of the pending section (before all normal pending orders). Non-pending orders (processing/complete) are unaffected.

**`ADD_BOT`**

1. Increment `botCounter`
2. Push new `Bot` with `status: 'idle'`, `currentOrderId: null`
3. Return new state

**`ASSIGN_ORDER`**

1. Find bot by `botId`, set `status: 'processing'`, `currentOrderId: orderId`
2. Find order by `orderId`, set `status: 'processing'`
3. Return new state

**`COMPLETE_ORDER`**

1. Find bot by `botId`, set `status: 'idle'`, `currentOrderId: null`
2. Find order by `orderId`, set `status: 'complete'`
3. Return new state

**`REMOVE_BOT`**

1. Find the bot with the **highest `id`** (most recently added)
2. If `bot.currentOrderId !== null`:
   - Set the associated order's `status` back to `'pending'`
   - The order must be re-inserted into the correct queue position (VIP before Normal)
3. Remove the bot from the `bots` array
4. Return new state

> **Order Return Logic on Bot Removal:** When returning an in-progress order to the pending queue, apply the same VIP/Normal insertion logic as `ADD_ORDER`. Do **not** simply append — the order must respect its original type priority.

### 5.3 Selectors

Defined in `src/store/selectors.ts`:

```typescript
// Returns pending orders in their correct priority order (VIP first, then Normal)
function getPendingOrders(state: AppState): Order[]

// Returns orders currently being processed by a bot
function getProcessingOrders(state: AppState): Order[]

// Returns completed orders
function getCompletedOrders(state: AppState): Order[]

// Returns the first unassigned pending order (the next one to be picked up)
function getNextPendingOrder(state: AppState): Order | null

// Returns idle bots
function getIdleBots(state: AppState): Bot[]
```

---

## 6. Core Business Logic

### 6.1 Bot Scheduler

The scheduler lives in a `useEffect` inside the main page component. It runs whenever `state.bots` or `state.orders` changes.

```
useEffect(() => {
  const idleBots = getIdleBots(state)
  const pendingOrders = getPendingOrders(state)

  // Pair each idle bot with the next pending order
  idleBots.forEach((bot, index) => {
    const order = pendingOrders[index]
    if (!order) return

    dispatch({ type: 'ASSIGN_ORDER', payload: { botId: bot.id, orderId: order.id } })

    const timer = setTimeout(() => {
      dispatch({ type: 'COMPLETE_ORDER', payload: { botId: bot.id, orderId: order.id } })
    }, 10_000)

    // Store timer ref so it can be cleared if bot is removed
    timerRefs.current[bot.id] = timer
  })
}, [state.bots, state.orders])
```

**Timer cleanup on bot removal:**

When `REMOVE_BOT` is dispatched, the component must also `clearTimeout` on the timer for that bot (if any). Use a `useRef` map keyed by `botId` to track active timers:

```typescript
const timerRefs = useRef<Record<number, ReturnType<typeof setTimeout>>>({})
```

On `REMOVE_BOT`, before dispatching:
1. Find the newest bot ID
2. Call `clearTimeout(timerRefs.current[newestBotId])`
3. Delete the entry from `timerRefs.current`
4. Then dispatch `REMOVE_BOT`

### 6.2 Order Priority Queue

The PENDING queue is always displayed in this order:

```
[ VIP #1 ] [ VIP #2 ] [ VIP #3 ] [ Normal #4 ] [ Normal #7 ] [ Normal #9 ]
  ↑ oldest VIP                      ↑ oldest Normal             ↑ newest Normal
```

When a new VIP order is added while Normal orders exist:

```
Before: [ VIP #1 ] [ Normal #4 ] [ Normal #7 ]
After:  [ VIP #1 ] [ VIP #8 ]   [ Normal #4 ] [ Normal #7 ]
                      ↑ new VIP inserted at end of VIP section
```

### 6.3 Bot Processing Rules

- A bot can only process **one order at a time**
- A bot processes the **first** order in the PENDING queue (highest priority = first VIP, then oldest Normal)
- On completion, the bot **immediately** looks for the next PENDING order
- If no pending order exists, the bot becomes **IDLE**
- When a new order is added and idle bots exist, the scheduler `useEffect` triggers and assigns the order

---

## 7. UI Component Structure

### 7.1 Component Tree

```
app/
└── page.tsx                    ← Root page, holds AppContext + useReducer
    ├── components/
    │   ├── ControlPanel.tsx    ← "New Normal Order", "New VIP Order", "+ Bot", "- Bot" buttons
    │   ├── BotList.tsx         ← Displays all bots and their status
    │   ├── OrderQueue.tsx      ← Renders PENDING and COMPLETE columns side by side
    │   │   └── OrderCard.tsx   ← Individual order card (shows ID, type, status, timer)
    │   └── BotCard.tsx         ← Individual bot card (shows ID, status, current order)
    └── context/
        └── AppContext.tsx      ← React Context + useReducer wiring
```

### 7.2 Layout Design

```
┌──────────────────────────────────────────────────────────┐
│  🍟 McDonald's Order Controller                           │
├──────────────────────────────────────────────────────────┤
│  [ New Normal Order ]  [ New VIP Order ]  [+ Bot] [- Bot]│
├──────────────────────────────────────────────────────────┤
│  BOTS                                                     │
│  [ Bot #1: PROCESSING Order #3 ████████░░ 8s ]           │
│  [ Bot #2: IDLE ]                                         │
├─────────────────────┬────────────────────────────────────┤
│  PENDING (3)        │  COMPLETE (2)                       │
│                     │                                     │
│  ⭐ VIP  Order #5   │  ✅ Order #1                        │
│  ⭐ VIP  Order #6   │  ✅ Order #2                        │
│  📋 Norm Order #4   │                                     │
└─────────────────────┴────────────────────────────────────┘
```

### 7.3 OrderCard Design

Each card in the PENDING column shows:
- Order number (e.g. `Order #5`)
- Type badge (`⭐ VIP` in gold or `📋 Normal` in gray)
- Status: `PENDING` or `PROCESSING` (with a visual progress indicator if being processed)

Each card in the COMPLETE column shows:
- Order number
- Type badge
- `✅ Complete` status

### 7.4 BotCard Design

Each bot card shows:
- Bot number (e.g. `Bot #1`)
- Status: `IDLE` or `PROCESSING Order #X`
- If processing: a progress bar that fills over 10 seconds (cosmetic, driven by CSS animation)

---

## 8. Implementation Phases

---

### Phase 1 — Project Setup

**Goal:** Scaffold the project, configure tooling, and establish folder structure.

**Steps:**

1. Scaffold project:
   ```bash
   npx create-next-app@latest feedme-order-controller \
     --typescript --tailwind --app --no-src-dir --import-alias "@/*"
   ```
   > Note: In Next.js 16, `create-next-app` uses Turbopack by default. No extra config needed.

2. Clean out boilerplate from `app/page.tsx` and `app/globals.css`

3. Create the folder structure:
   ```
   app/
   ├── page.tsx
   ├── layout.tsx
   ├── globals.css
   components/
   ├── ControlPanel.tsx
   ├── BotList.tsx
   ├── BotCard.tsx
   ├── OrderQueue.tsx
   └── OrderCard.tsx
   context/
   └── AppContext.tsx
   store/
   ├── reducer.ts
   ├── actions.ts
   └── selectors.ts
   types/
   └── index.ts
   ```

4. Add Prettier config (`.prettierrc`): `{ "semi": true, "singleQuote": true, "tabWidth": 2 }`

**Deliverable:** Running `npm run dev` shows a blank page with no errors.

---

### Phase 2 — Data Layer (Types, State, Reducer)

**Goal:** Implement all types, the reducer, and selectors with zero UI.

**Steps:**

1. Define all types in `types/index.ts` (see Section 4)

2. Implement `store/reducer.ts`:
   - Initial state: `{ orders: [], bots: [], orderCounter: 0, botCounter: 0 }`
   - Handle all 5 actions (see Section 5.2)
   - For `ADD_ORDER`: implement the VIP/Normal priority insertion correctly
   - For `REMOVE_BOT`: implement order return logic correctly

3. Implement `store/selectors.ts` (see Section 5.3)

4. Wire up `context/AppContext.tsx`:
   ```typescript
   'use client';
   import { createContext, useContext, useReducer, useRef } from 'react';
   // Export: AppContext, useAppContext, AppProvider
   ```

5. Wrap `app/page.tsx` in `<AppProvider>`

**Verification (manual):** Add a temporary button in `page.tsx` that dispatches `ADD_ORDER` and logs the resulting state to the console. Confirm VIP orders appear before Normal orders.

---

### Phase 3 — Bot Scheduler Logic

**Goal:** Implement the bot-to-order assignment engine and the 10-second timer.

**Steps:**

1. Inside `AppContext.tsx` (or a custom hook `useScheduler.ts`), add the scheduling `useEffect`:
   - On every state change, scan for idle bots and pending orders
   - For each pairing: dispatch `ASSIGN_ORDER`, then set a `setTimeout` for 10,000ms to dispatch `COMPLETE_ORDER`
   - Store timer references in `timerRefs` (a `useRef<Record<number, NodeJS.Timeout>>`)

2. Implement `REMOVE_BOT` button handler:
   - Find the highest-ID bot
   - Call `clearTimeout(timerRefs.current[botId])` if it exists
   - Dispatch `REMOVE_BOT`

3. **Edge case — race condition prevention:** The `useEffect` must not re-assign an order that is already `status: 'processing'`. Use `getNextPendingOrder` (which only returns `status === 'pending'` orders) to prevent double-assignment.

**Verification (manual):**
- Add one bot → no pending orders → bot stays IDLE in state
- Add one order → bot immediately picks it up → after 10s → order becomes complete
- Add two bots, three orders → two orders are processed in parallel, third waits
- Remove processing bot → order returns to PENDING → remaining bot picks it up

---

### Phase 4 — UI Components

**Goal:** Build all visual components connected to the store.

**Steps:**

1. **`ControlPanel.tsx`**
   - Four buttons: "New Normal Order", "New VIP Order", "+ Bot", "- Bot"
   - "- Bot" is disabled when `state.bots.length === 0`
   - Each button calls the appropriate dispatch action

2. **`OrderCard.tsx`**
   - Props: `order: Order`
   - Shows order ID, type badge (VIP = gold, Normal = gray), status
   - If `status === 'processing'`: show a progress bar with a 10s CSS `animation`
   
3. **`OrderQueue.tsx`**
   - Uses selectors to get `pendingOrders` and `completedOrders`
   - Renders two columns side by side: PENDING (left), COMPLETE (right)
   - Shows count in column header: `PENDING (3)`

4. **`BotCard.tsx`**
   - Props: `bot: Bot`
   - Shows bot ID, status badge (IDLE = gray, PROCESSING = green)
   - If processing: shows which order number it's working on

5. **`BotList.tsx`**
   - Maps over `state.bots` and renders a `BotCard` for each

6. **`app/page.tsx`**
   - Renders: `<ControlPanel>` → `<BotList>` → `<OrderQueue>`

**Verification (manual):**
- All buttons render and trigger correct state changes
- VIP orders appear above normal orders in PENDING column
- COMPLETE column grows as orders finish
- Bots display correct processing status

---

### Phase 5 — Visual Polish & Edge Cases

**Goal:** Ensure a good user experience, handle all edge cases, and verify all requirements.

**Steps:**

1. **Styling:**
   - McDonald's-inspired color accent (yellow `#FFC72C` / red `#DA291C`) for header and VIP badges
   - Consistent spacing, card shadows, rounded corners via Tailwind
   - Responsive layout (stacks vertically on mobile)

2. **Progress bar animation:**
   - Use a CSS `@keyframes` animation (`width: 0% → 100%`) over exactly 10 seconds on processing order cards
   - This is purely cosmetic and does not control the actual timer

3. **Edge cases to verify:**

   | Scenario | Expected Behaviour |
   |----------|--------------------|
   | Click "- Bot" with no bots | Button is disabled; nothing happens |
   | Click "- Bot" with idle bot | Bot is removed silently |
   | Click "- Bot" with processing bot | Timer is cleared; order returns to correct PENDING position |
   | Add VIP order when no pending orders exist | VIP appears first in PENDING |
   | Add VIP order after normal orders exist | VIP appears before all normals |
   | Add VIP order after other VIP orders | New VIP appears after existing VIPs |
   | Multiple bots, new order arrives | One idle bot immediately picks it up |
   | All bots idle, no pending orders | All bots show IDLE |
   | Rapid clicks on "+ Bot" | Each bot gets a unique incrementing ID |

4. **Accessibility basics:** Add `aria-label` to all buttons, ensure keyboard navigation works.

---

### Phase 6 — Deployment

**Goal:** Deploy to a publicly accessible URL.

**Steps:**

1. Push code to a GitHub repository

2. Connect repo to [Vercel](https://vercel.com):
   - Import project → select repository → keep all defaults (Next.js 16 is auto-detected)
   - Click **Deploy**

3. Verify the production URL:
   - All buttons function correctly
   - 10-second timer works as expected
   - No console errors

4. Add the deployment URL to the repository `README.md`

---

## 9. Test Scenarios

All scenarios should be verified manually before the interview.

### 9.1 Order Queue Priority

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Add Normal Order | Order #1 appears in PENDING |
| 2 | Add Normal Order | Order #2 appears after Order #1 in PENDING |
| 3 | Add VIP Order | Order #3 appears **before** Order #1 in PENDING |
| 4 | Add VIP Order | Order #4 appears **after** Order #3 but **before** Order #1 in PENDING |
| Queue | — | `[VIP #3] [VIP #4] [Normal #1] [Normal #2]` |

### 9.2 Bot Processing

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Add 3 orders | 3 orders in PENDING |
| 2 | Add Bot #1 | Bot picks up `[VIP #3]` (first in queue), status → PROCESSING |
| 3 | Add Bot #2 | Bot picks up `[VIP #4]`, status → PROCESSING |
| 4 | Wait 10 seconds | Both orders move to COMPLETE; bots pick up next orders |
| 5 | After another 10s | Remaining orders complete; bots become IDLE |

### 9.3 Bot Removal

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Add 1 Normal Order, 1 Bot | Bot processes Order #1 |
| 2 | Click "- Bot" during processing | Timer cleared; Order #1 returns to PENDING; no bots remain |
| 3 | Add Bot again | New Bot #2 picks up Order #1; processes it over 10s |

### 9.4 Idle Bot Activation

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Add 2 Bots, no orders | Both bots are IDLE |
| 2 | Add 1 Normal Order | One bot immediately picks up the order |
| 3 | Add 1 VIP Order | The second idle bot picks up the VIP order immediately |

---

## 10. File & Folder Structure

Final expected project structure:

```
feedme-order-controller/
├── app/
│   ├── layout.tsx            # Root layout, wraps with AppProvider
│   ├── page.tsx              # Main page: ControlPanel + BotList + OrderQueue
│   └── globals.css           # Tailwind base + custom keyframe animations
├── components/
│   ├── ControlPanel.tsx      # Action buttons
│   ├── BotList.tsx           # List of all bots
│   ├── BotCard.tsx           # Single bot display
│   ├── OrderQueue.tsx        # PENDING + COMPLETE columns
│   └── OrderCard.tsx         # Single order card
├── context/
│   └── AppContext.tsx        # useReducer + Context + scheduler useEffect
├── store/
│   ├── reducer.ts            # Pure reducer function
│   ├── actions.ts            # Action type definitions
│   └── selectors.ts          # Pure selector functions
├── types/
│   └── index.ts              # All TypeScript interfaces
├── public/                   # Static assets (favicon, etc.)
├── next.config.ts            # Next.js 16 config (minimal, Turbopack is default)
├── tailwind.config.ts        # Tailwind config
├── tsconfig.json             # TypeScript config
├── .prettierrc               # Prettier config
└── README.md                 # Setup instructions + deployment URL
```

---

## Appendix A: Key Decisions & Rationale

| Decision | Rationale |
|----------|-----------|
| `useReducer` over Zustand/Redux | Avoids external dependencies; state transitions are explicit and testable; sufficient for this app's scale |
| Flat `orders` array with derived selectors | Simpler than maintaining separate pending/complete arrays; selectors are pure and easy to unit test |
| `useEffect` for scheduling | Keeps scheduling reactive to state changes; avoids imperative polling |
| `useRef` for timer IDs | Timers are side effects, not part of React state; `useRef` persists across renders without triggering re-renders |
| `'use client'` on context/components | The entire app is client-side; all interactive state lives in the browser |
| Tailwind CSS over CSS Modules | Faster iteration; sufficient for a prototype; consistent design tokens |

---

## Appendix B: Constraints & Out of Scope

The following are explicitly **out of scope** for this take-home:

- WebSocket / real-time sync between multiple clients
- Database or any backend persistence
- Authentication or user login
- Unit/integration tests (manual testing is sufficient per assignment)
- Accessibility beyond basic `aria-label` attributes
- Mobile-specific optimizations
