# PRD: McDonald's Automated Order Controller (Kitchen Display System)

## Overview

We are building a single-page Kitchen Display System (KDS) dashboard for McDonald's automated kitchens. The system lets customers submit orders (Normal or VIP) and watch them move through a three-stage lifecycle — PENDING → PROCESSING → COMPLETE — while managers can add or remove cooking bots in real time. VIP orders always jump ahead of Normal orders in the queue, and every order takes exactly 10 seconds to process per bot. All state lives in memory; there is no persistence, no authentication, and no multi-user synchronization.

---

## Technical Decisions

Resolved from brief deferrals:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Next.js router | **App Router** | Modern default for new Next.js projects; server components and streaming support |
| Styling approach | **CSS Modules** | Scoped styles without runtime cost; no additional dependency |
| Initial bot count | **0 bots** | Manager must click "+ Bot" to add capacity |
| Order number overflow | **Wrap to 0001 after 9999** | Keeps numbers readable and fits the 4-digit KDS display convention |
| Deployment | **Vercel** (free tier) | Zero-config Next.js hosting; publicly accessible URL required by project spec |

---

## User Stories

### US-1: Customer Submits a Normal Order

**As a** McDonald's customer
**I want** to submit a Normal order by clicking a "New Normal Order" button
**So that** my order enters the kitchen queue and eventually gets fulfilled.

**Acceptance Criteria:**

- [ ] A "New Normal Order" button is visible and clickable at all times.
- [ ] Each click creates a new order ticket with a unique, auto-incrementing order number (e.g., #1001, #1002, #1003…).
- [ ] The new order appears in the **PENDING** column.
- [ ] Within the PENDING column, the new Normal order is placed at the bottom of the Normal tier (below all VIP orders and below any existing Normal orders).
- [ ] If at least one bot is idle when the order is submitted, the order is picked up immediately and moves to the PROCESSING column within 500ms.
- [ ] If no bot is idle, the order remains in PENDING until a bot becomes available.
- [ ] Each order should have a unique id that for program code to refer to

**Edge Cases:**

- What if a large number of Normal orders are submitted in rapid succession (e.g., 100+)? → Each gets a unique, incrementing number. All appear in PENDING in insertion order within the Normal tier. Bots pick them up one at a time as they become available.
- What if the order number reaches 9999? → The counter wraps to 0001 and continues incrementing. No duplicate numbers are generated at any given time since the simulation should not produce 10,000+ concurrent orders.

---

### US-2: Customer Submits a VIP Order with Priority

**As a** McDonald's VIP member
**I want** to submit a VIP order by clicking a "New VIP Order" button
**So that** my order jumps ahead of all Normal orders in the queue.

**Acceptance Criteria:**

- [ ] A "New VIP Order" button is visible and clickable at all times.
- [ ] Each click creates a new order ticket with a unique, auto-incrementing order number (sharing the same global sequence as Normal orders).
- [ ] The new VIP order appears in the **PENDING** column.
- [ ] Within PENDING, the VIP order is placed **after** all existing VIP orders but **before** all Normal orders.
- [ ] When a bot becomes available, the system picks up the earliest-arriving VIP order before any Normal order, even if the Normal order has been waiting longer.
- [ ] If multiple VIP orders are queued, they are processed in first-in-first-out order (by submission time).

**Edge Cases:**

- What if only VIP orders exist in PENDING? → They behave FIFO among themselves, no special reordering needed.
- What if a VIP order is submitted while a Normal order is mid-processing? → The Normal order continues uninterrupted. The VIP order goes to PENDING and waits for the next available bot.
- What if the user rapidly clicks both "New Normal Order" and "New VIP Order" in alternation? → Orders interleave in PENDING correctly: VIPs always grouped together before Normals, each tier FIFO internally.

---

### US-3: User Watches Order Lifecycle Progress

**As a** McDonald's customer or manager
**I want** to see each order move through PENDING → PROCESSING → COMPLETE with a visible progress indicator
**So that** I know the status of every order at a glance.

**Acceptance Criteria:**

- [ ] Every order ticket is visually grouped into one of three columns: **PENDING**, **PROCESSING**, or **COMPLETE**.
- [ ] When a bot picks up a PENDING order, the ticket transitions from the PENDING column to the PROCESSING column within 500ms.
- [ ] While in PROCESSING, the order ticket displays a **progress bar** that fills from 0% to 100% over exactly 10 seconds.
- [ ] The progress bar updates at least every 200ms, producing a visually smooth fill (not a single jump from 0% to 100%).
- [ ] When the progress bar reaches 100%, the order ticket moves from PROCESSING to the **COMPLETE** column.
- [ ] Completed orders persist in the COMPLETE column for the remainder of the session (no auto-removal).
- [ ] Each order ticket displays its unique order number and type (VIP or Normal) at all stages.

**Edge Cases:**

- What if the browser tab loses focus during processing? → The progress bar continues advancing based on elapsed real time (not tab-active time). When the user returns, the bar reflects actual elapsed time.
- What if the user refreshes the page? → All state resets. This is expected behavior — no persistence. The COMPLETE column is empty on reload.
- What if 50 orders are in the COMPLETE column? → The column becomes scrollable. No orders are hidden or truncated.

---

### US-4: Manager Adds a Cooking Bot

**As a** McDonald's manager
**I want** to add a cooking bot by clicking a "+ Bot" button
**So that** the kitchen can process orders faster.

**Acceptance Criteria:**

- [ ] A "+ Bot" button is visible and clickable.
- [ ] The current number of active bots is displayed at all times.
- [ ] Clicking "+ Bot" increments the bot count by 1.
- [ ] The new bot immediately evaluates the PENDING queue: if any orders are waiting, the bot picks up the highest-priority order (earliest VIP, or earliest Normal if no VIPs exist) and begins processing it.
- [ ] The bot count display updates to reflect the new total.
- [ ] Each bot has a visible per-bot status indicator (e.g., "Bot 1 — Idle", "Bot 2 — Processing #1004").

**Edge Cases:**

- What if "+ Bot" is clicked when there are no PENDING orders? → The bot spawns and remains idle. Its status shows "Idle." It will pick up the next submitted order immediately.
- What if "+ Bot" is clicked rapidly (e.g., 10 times in 2 seconds)? → All bots spawn successfully, each picking up the next available PENDING order if any exist. Remaining bots sit idle.
- What if there are already 20 bots and PENDING is empty? → All bots spawn idle. No error or limit enforcement (no arbitrary max for the prototype).

---

### US-5: Manager Removes a Cooking Bot

**As a** McDonald's manager
**I want** to remove a cooking bot by clicking a "- Bot" button
**So that** I can scale down kitchen capacity.

**Acceptance Criteria:**

- [ ] A "- Bot" button is visible and clickable.
- [ ] Clicking "- Bot" removes the **most recently added** bot.
- [ ] If the removed bot was **idle**, it simply disappears. The bot count decrements. No orders are affected.
- [ ] If the removed bot was **processing** an order, that order is immediately returned to the **PENDING** column at its original priority position (VIP orders stay ahead of Normal orders; within its tier, it resumes its original FIFO position relative to when it was originally submitted).
- [ ] The returned order retains its original order number. No new number is assigned.
- [ ] The returned order's progress bar is reset to 0%. If picked up by another bot later, it restarts the full 10-second processing time.
- [ ] Bot count display updates to reflect the new total.
- [ ] Bot IDs are permanently incrementing and never re-index. Removing Bot 3 then adding a new bot produces Bot 4, not Bot 3.

**Edge Cases:**

- What if "- Bot" is clicked when bot count is 0? → The button should be disabled or the click should be a no-op. No negative bot count.
- What if the removed bot was the only bot processing an order? → That order returns to PENDING at its correct priority position. No bot is processing it until another bot is added or becomes available.
- What if the removed bot was processing a VIP order and there are other VIP orders also in PENDING? → The returned VIP order resumes its original FIFO position among the VIP tier by submission time. It should NOT go to the back of the VIP queue. Example: VIP #1003 (submitted T=3) was being processed; VIP #1005 (T=5) and VIP #1008 (T=8) are waiting in PENDING. Bot is removed → #1003 returns to PENDING and appears **before** both #1005 and #1008 because its submission time (T=3) is earliest.
- What if the removed bot is idle and there are zero orders total in the system? → The bot simply disappears. No orders are affected. Identical to the "removed bot was idle" case.
- What if the user adds and removes bots rapidly in succession? → Each operation is independent. The "newest bot" rule means the last-added bot is always the one removed. No orphaned orders or bots.

---

### US-6: System Displays Dashboard State at a Glance

**As a** McDonald's manager or customer
**I want** to see the full dashboard — all three order columns, bot count, and per-bot statuses — on one screen
**So that** I can understand kitchen status instantly.

**Acceptance Criteria:**

- [ ] The dashboard is a single page (no navigation required).
- [ ] Three columns — PENDING, PROCESSING, COMPLETE — are visible simultaneously.
- [ ] PENDING column is sorted: all VIP orders grouped together before all Normal orders, each group internally ordered by submission time (oldest first).
- [ ] PROCESSING column shows one order per active bot (or is empty if no bots are processing).
- [ ] COMPLETE column shows all finished orders in the order they completed.
- [ ] Bot count and individual bot statuses (Idle / Processing #OrderID) are visible at all times.
- [ ] The "+ Bot" and "- Bot" buttons are always visible and reachable.
- [ ] The "New Normal Order" and "New VIP Order" buttons are always visible and reachable.

**Edge Cases:**

- What if there are zero orders and zero bots? → All three columns are empty (but labeled). Bot count displays "0." "+ Bot" is enabled; "- Bot" is disabled.
- What if there are 50+ orders across columns? → Each column scrolls independently or the page scrolls as a whole. No layout breakage.

---

## Non-Functional Requirements

| Requirement | Specification |
|---|---|
| **Processing duration** | Every order takes exactly 10 seconds (±0.5s tolerance) from bot pickup to completion. |
| **Bot pickup latency** | When a bot becomes idle and PENDING is non-empty, the next order is picked up within 500ms. |
| **Progress bar smoothness** | Progress bar updates at least once per 200ms (visually smooth fill). |
| **Page load time** | Dashboard renders in under 2 seconds on a desktop browser with 4G connection. |
| **Browser support** | Latest versions of Chrome, Firefox, Safari, and Edge (desktop only). |
| **Layout** | Desktop-optimized (minimum viewport width: 1024px). Not responsive for mobile/tablet. |
| **Language** | English only. All labels, buttons, and status text in English. |
| **Concurrency** | Single browser session. No multi-tab or multi-user synchronization. |
| **Order capacity** | The system must handle at least 200 concurrent order tickets without visible performance degradation (smooth progress bar updates, sub-500ms bot pickup). |
| **Deployment** | Must be deployed to Vercel free tier and serve a publicly accessible URL. |
| **Time constraint** | Implementation target: ~1 hour. Prioritize core functionality over polish. Do not over-engineer. |

---

## Explicitly Out of Scope

- **Data persistence** — All state resets on page refresh. No localStorage, no cookies, no database.
- **Authentication / login / user roles** — No login screen, no customer-vs-manager role enforcement. The dashboard is a combined single-view demo.
- **Backend API** — No REST endpoints, no GraphQL, no external services. All logic executes in-browser or within the Next.js server (in-memory state only).
- **Multi-user sync** — No WebSockets, no Server-Sent Events, no polling. Single-browser, single-session only.
- **Mobile / tablet responsiveness** — Desktop layout only. No responsive breakpoints.
- **Internationalization (i18n)** — English-only strings. No translation keys or locale support.
- **Accessibility (a11y)** — Not required for prototype. No ARIA labels, screen-reader testing, or keyboard navigation requirements.
- **Order cancellation or modification** — Once an order is created, it cannot be cancelled, edited, or removed.
- **Order details beyond ID and type** — No food items, quantities, special instructions, or customer names on tickets.
- **Bot configuration beyond count** — No bot speed settings, no bot naming, no bot assignment preferences.
- **Analytics / metrics** — No order throughput stats, no average wait time display, no logging.
- **Error monitoring** — No Sentry, no crash reporting.
- **Testing framework** — No automated tests required for the frontend path (only backend CI is in scope per brief).
- **CI/CD pipeline** — GitHub Actions workflows are not required for the frontend path.
