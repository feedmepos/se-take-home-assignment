# McDonald's Order Management System

## Technical Flow Overview

---

## What is This?

A **McDonald's Order Management System** with AI-powered cooking bots. The system handles:

- Customer order creation (Normal & VIP members)
- Automated order assignment to cooking bots
- Priority queue processing (VIP orders first)
- 10-second cooking simulation per order

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Browser)                       │
│  ┌─────────────────────────────────────────────────────────┐│
│  │           Dashboard (3-Column Layout)                    ││
│  │    ┌──────────┐  ┌────────────┐  ┌───────────┐         ││
│  │    │ PENDING  │  │ PROCESSING │  │ COMPLETE  │         ││
│  │    │  Orders  │  │   Orders   │  │  Orders   │         ││
│  │    └──────────┘  └────────────┘  └───────────┘         ││
│  │                                                          ││
│  │    ┌─────────────────────────────────────────┐          ││
│  │    │           Bot Fleet Display             │          ││
│  │    │   [Bot 1] [Bot 2] [Bot 3] [+ Add]      │          ││
│  │    └─────────────────────────────────────────┘          ││
│  └─────────────────────────────────────────────────────────┘│
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP Polling (every 2 seconds)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND (Nitro/Vercel)                   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    API Routes                            ││
│  │   /api/orders    →  Create & list orders                ││
│  │   /api/bots      →  Manage bot fleet                    ││
│  │   /api/bots/:id/claim  →  Assign order to bot           ││
│  │   /api/orders/complete →  Mark order done (callback)    ││
│  └─────────────────────────────────────────────────────────┘│
└────────────────────────┬────────────────────────────────────┘
                         │
          ┌──────────────┴──────────────┐
          ▼                             ▼
┌─────────────────────┐    ┌─────────────────────────┐
│  DATABASE (Turso)   │    │   QSTASH (Upstash)      │
│                     │    │                         │
│  • users            │    │  Scheduled callbacks    │
│  • orders           │    │  (10-second delay)      │
│  • bots             │    │                         │
│  • orderNumbers     │    │  → /api/orders/complete │
└─────────────────────┘    └─────────────────────────┘
```

---

## User Roles

| Role | Capabilities |
|------|-------------|
| **NORMAL** | Create normal orders |
| **VIP** | Create VIP orders (priority processing) |
| **MANAGER** | Add/remove bots, clear orders, view all |
| **BOT** | System role for cooking bots |

---

## Core Flows

### Flow 1: Creating an Order

```
    Customer                    System
       │                          │
       │  Click "New Order"       │
       │─────────────────────────▶│
       │                          │
       │                    ┌─────┴─────┐
       │                    │ Dashboard │
       │                    │ :119-141  │
       │                    └─────┬─────┘
       │                          │
       │                          ▼
       │                    ┌───────────────────┐
       │                    │ POST /api/orders  │
       │                    │ route.ts:254-296  │
       │                    └─────────┬─────────┘
       │                              │
       │                              ▼
       │                    ┌───────────────────┐
       │                    │ Database:         │
       │                    │ 1. Get next #     │
       │                    │ 2. Insert order   │
       │                    │    (PENDING)      │
       │                    └─────────┬─────────┘
       │                              │
       │◀─────────────────────────────┘
       │  Order appears in PENDING column
```

**Key Files:**

- `pos/src/components/Dashboard.tsx:119-141` - Order creation UI logic
- `pos/src/routes/api/orders/route.ts:254-296` - API handler
- `pos/src/db/schema.ts:16-41` - Order schema definition

---

### Flow 2: Bot Claims & Processes Order

```
    Dashboard                Bot System              QStash
       │                         │                     │
       │ Detects: idle bot +     │                     │
       │ pending order           │                     │
       │─────────────────────────▶                     │
       │                         │                     │
       │              ┌──────────┴──────────┐          │
       │              │ POST /api/bots/:id  │          │
       │              │     /claim          │          │
       │              │ route.ts:18-155     │          │
       │              └──────────┬──────────┘          │
       │                         │                     │
       │              ┌──────────┴──────────┐          │
       │              │ Transaction:         │          │
       │              │ 1. Check bot IDLE    │          │
       │              │ 2. Find best order   │          │
       │              │    (VIP first!)      │          │
       │              │ 3. Update order →    │          │
       │              │    PROCESSING        │          │
       │              │ 4. Update bot →      │          │
       │              │    PROCESSING        │          │
       │              └──────────┬──────────┘          │
       │                         │                     │
       │                         │ Schedule callback   │
       │                         │ (10 second delay)   │
       │                         │────────────────────▶│
       │                         │                     │
       │◀────────────────────────┘                     │
       │  Order shows cooking animation               │
       │  Progress bar counts down                    │
       │                                               │
       │            ⏱️ 10 SECONDS PASS ⏱️              │
       │                                               │
       │                         │◀────────────────────│
       │              ┌──────────┴──────────┐ Callback │
       │              │ POST /api/orders    │          │
       │              │     /complete       │          │
       │              │ route.ts:16-97      │          │
       │              └──────────┬──────────┘          │
       │                         │                     │
       │              ┌──────────┴──────────┐          │
       │              │ 1. Verify signature │          │
       │              │ 2. Mark COMPLETE    │          │
       │              │ 3. Reset bot → IDLE │          │
       │              └──────────┬──────────┘          │
       │                         │                     │
       │◀────────────────────────┘                     │
       │  Order moves to COMPLETE column              │
       │  Bot ready for next order                    │
```

**Key Files:**

- `pos/src/components/Dashboard.tsx:211-243` - Auto-claim detection
- `pos/src/routes/api/bots/$id/claim/route.ts:18-155` - Claim transaction
- `pos/src/routes/api/orders/complete/route.ts:16-97` - Completion callback

---

### Flow 3: Priority Queue (VIP First)

```
                    ORDER QUEUE
    ┌─────────────────────────────────────────┐
    │                                         │
    │  Priority 0: VIP PENDING    ◀── First   │
    │     • VIP Order #5                      │
    │     • VIP Order #8                      │
    │                                         │
    │  Priority 1: NORMAL PENDING             │
    │     • Normal Order #3                   │
    │     • Normal Order #6                   │
    │     • Normal Order #7                   │
    │                                         │
    │  Priority 2: PROCESSING                 │
    │     • Order #4 (Bot 1)                  │
    │                                         │
    │  Priority 3: COMPLETE       ◀── Last    │
    │     • Order #1, #2                      │
    │                                         │
    └─────────────────────────────────────────┘

    Within same priority: FIFO by order number
    (Order #5 before #8 for VIPs)
```

**Sorting Logic:** `pos/src/routes/api/orders/route.ts:233-242`

---

### Flow 4: Bot Removal (Graceful)

```
    Manager                     System
       │                          │
       │  Click "Remove Bot"      │
       │─────────────────────────▶│
       │                          │
       │                    ┌─────┴──────────┐
       │                    │ DELETE         │
       │                    │ /api/bots/:id  │
       │                    │ route.ts:99-148│
       │                    └─────┬──────────┘
       │                          │
       │              ┌───────────┴───────────┐
       │              │ Was bot processing?   │
       │              └───────────┬───────────┘
       │                          │
       │         ┌────────────────┼────────────────┐
       │         ▼ YES            │                ▼ NO
       │   ┌───────────────┐      │      ┌───────────────┐
       │   │ Return order  │      │      │ Just delete   │
       │   │ to PENDING    │      │      │ the bot       │
       │   │ queue         │      │      │               │
       │   └───────────────┘      │      └───────────────┘
       │         │                │                │
       │         └────────────────┴────────────────┘
       │                          │
       │◀─────────────────────────┘
       │  Bot removed
       │  Order (if any) back in queue
```

**Key File:** `pos/src/routes/api/bots/$id/route.ts:99-148`

**What if bot is removed mid-QStash processing (5s of 10s)?**

When a bot is removed while QStash is counting down:

1. Order reverts to PENDING, `botId = null`
2. Another bot immediately claims it: `botId = new_bot`
3. New QStash callback scheduled with new bot's ID
4. **Old callback fires at 10s** with original bot's ID
   - Checks: `order.botId !== old_bot_id`? → Mismatch!
   - Returns early: "Order already finalized" (rejected safely)
5. **New callback fires at 20s** (5s + 10s) with new bot's ID
   - Checks: `order.botId === new_bot_id`? → Match!
   - Completes the order correctly ✅

The `botId` in each QStash payload acts as an **ownership token** to prevent stale callbacks from corrupting data.

**Files:**
- QStash payload includes botId: `pos/src/routes/api/bots/$id/claim/route.ts:121-129`
- Validation check: `pos/src/routes/api/orders/complete/route.ts:56`

---

### Flow 5: Crash Recovery

```
    Server Starts / Client Polls
              │
              ▼
    ┌─────────────────────────────┐
    │ GET /api/orders             │
    │ route.ts:216-244            │
    └────────────┬────────────────┘
                 │
                 ▼
    ┌─────────────────────────────┐
    │ Try acquire distributed     │
    │ lock (30s TTL)              │
    │ route.ts:18-77              │
    └────────────┬────────────────┘
                 │
        ┌────────┴────────┐
        ▼ GOT LOCK        ▼ NO LOCK
        │                 │
        │                 └──▶ Skip recovery
        │                      (another process
        │                       is handling it)
        ▼
    ┌─────────────────────────────┐
    │ 1. Recover stuck bots       │
    │    route.ts:87-106          │
    │                             │
    │    Find bots PROCESSING     │
    │    but no currentOrderId    │
    │    → Set back to IDLE       │
    └────────────┬────────────────┘
                 │
                 ▼
    ┌─────────────────────────────┐
    │ 2. Resume processing orders │
    │    route.ts:108-188         │
    │                             │
    │    Find PROCESSING orders   │
    │    Check elapsed time:      │
    │    • >= 10s → Complete now  │
    │    • < 10s → Re-schedule    │
    │              QStash callback│
    └─────────────────────────────┘
```

**Key File:** `pos/src/routes/api/orders/route.ts:87-188`

---

## Database Schema Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         USERS                                │
├─────────────────────────────────────────────────────────────┤
│  id          │ UUID7 (Primary Key)                          │
│  username    │ Unique identifier                            │
│  role        │ NORMAL | VIP | MANAGER | BOT                 │
│  deletedAt   │ Soft delete timestamp                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ creates
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         ORDERS                               │
├─────────────────────────────────────────────────────────────┤
│  id                  │ UUID7 (Primary Key)                  │
│  orderNumber         │ Auto-increment sequence              │
│  type                │ NORMAL (1) | VIP (0)  ← Priority!    │
│  status              │ PENDING | PROCESSING | COMPLETE      │
│  userId              │ FK → users                           │
│  botId               │ FK → bots (when processing)          │
│  processingStartedAt │ Timer start                          │
│  completedAt         │ When finished                        │
│  deletedAt           │ Soft delete timestamp                │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ processes
                              │
┌─────────────────────────────────────────────────────────────┐
│                          BOTS                                │
├─────────────────────────────────────────────────────────────┤
│  id              │ UUID7 (Primary Key)                      │
│  status          │ IDLE | PROCESSING                        │
│  currentOrderId  │ FK → orders (when processing)            │
│  deletedAt       │ Soft delete timestamp                    │
└─────────────────────────────────────────────────────────────┘
```

**Schema Definition:** `pos/src/db/schema.ts:1-76`

---

## Key Technical Decisions

### 1. Soft Delete Pattern

All deletions use `deletedAt` timestamp instead of hard DELETE.

- Preserves audit trail
- No cascading delete issues
- Easy data recovery

### 2. Distributed Locking

Prevents "thundering herd" on server recovery.

- Lock TTL: 30 seconds
- Only one instance runs recovery at a time
- **File:** `pos/src/routes/api/orders/route.ts:18-77`

### 3. QStash for Scheduling

Offloads 10-second timer to Upstash.

- Server doesn't need to maintain timers
- Survives server restarts
- Verifiable signatures for security

### 4. Transaction-Based Claims

Bot claiming uses atomic database transactions.

- Prevents race conditions
- Two bots can't claim same order
- **File:** `pos/src/routes/api/bots/$id/claim/route.ts:18-155`

---

## File Reference Index

### Backend (API)

| File | Purpose |
|------|---------|
| `pos/src/routes/api/orders/route.ts` | Order CRUD + recovery |
| `pos/src/routes/api/orders/complete/route.ts` | QStash callback handler |
| `pos/src/routes/api/bots/route.ts` | Bot fleet management |
| `pos/src/routes/api/bots/$id/claim/route.ts` | Order assignment |
| `pos/src/routes/api/bots/$id/route.ts` | Individual bot ops |

### Frontend (React)

| File | Purpose |
|------|---------|
| `pos/src/components/Dashboard.tsx` | Main UI layout |
| `pos/src/components/OrderCard.tsx` | Order display card |
| `pos/src/components/BotDisplay.tsx` | Bot status display |
| `pos/src/components/ControlPanel.tsx` | Action buttons |

### Database

| File | Purpose |
|------|---------|
| `pos/src/db/schema.ts` | Drizzle ORM schemas |
| `pos/src/db/index.ts` | Connection setup |

### State Management

| File | Purpose |
|------|---------|
| `pos/src/store/auth.ts` | User authentication state |
| `pos/src/store/order.ts` | Order filtering state |
| `pos/src/store/bot.ts` | Bot timer countdown |

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | TanStack Start (React 19 SSR) |
| **Routing** | TanStack Router (file-based) |
| **UI** | shadcn/ui + Tailwind CSS v4 |
| **State** | TanStack Store + Query |
| **Database** | Drizzle ORM + Turso (LibSQL) |
| **Backend** | Nitro (Vercel preset) |
| **Scheduling** | Upstash QStash |
| **Deployment** | Vercel (single instance) |

---

## Quick Summary

1. **Customer creates order** → Goes to PENDING queue
2. **System detects idle bot** → Claims highest priority order
3. **VIP orders always first** → Then by order number (FIFO)
4. **Bot processes for 10 seconds** → QStash handles timing
5. **Order completes** → Bot goes IDLE, ready for next
6. **If bot removed mid-processing** → Order returns to queue
7. **If server crashes** → Recovery logic resumes/completes orders

---

*Generated for McDonald's Order Management System - SE Take Home Assignment*
