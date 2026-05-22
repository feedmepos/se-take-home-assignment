# Orders → Bot Queue System Architecture

## Overview

This document explains how orders are queued and assigned to bots in the POS system. The system implements a priority-based queue with atomic database transactions, client-side timer management, cross-tab coordination, and server-side recovery mechanisms.

---

## 1. Data Structures

### Order Model

Orders are stored in the `orders` table with the following schema:

```typescript
{
  id: UUID7                 // Primary key
  orderNumber: integer      // Auto-incrementing sequence number
  type: 'NORMAL' | 'VIP'    // Priority indicator
  status: 'PENDING' | 'PROCESSING' | 'COMPLETE'
  userId: UUID7 | null      // Reference to user
  botId: UUID7 | null       // Which bot is processing it
  createdAt: timestamp
  processingStartedAt: timestamp  // When bot started
  completedAt: timestamp          // When finished
  updatedAt: timestamp
  deletedAt: timestamp      // Soft delete flag
}
```

**Unique Constraints:**

- `orders_processing_bot_active`: Only one PROCESSING order per bot
- `orders_order_number_active`: Order numbers are unique

### Bot Model

Bots are stored in the `bots` table:

```typescript
{
  id: UUID7
  status: 'IDLE' | 'PROCESSING'
  currentOrderId: UUID7 | null     // What they're working on
  createdAt: timestamp
  updatedAt: timestamp
  deletedAt: timestamp
}
```

### Order Number Sequence

Order numbers are generated via an auto-incrementing sequence table:

```typescript
{
  id: integer (auto-increment)  // Next order number
  createdAt: timestamp
}
```

### Resume Locks

Distributed lock table for preventing concurrent resume operations:

```typescript
{
  id: text              // Lock identifier ('resume_processing')
  lockedAt: timestamp   // When lock was acquired
  expiresAt: timestamp  // When lock expires (TTL: 5 seconds)
}
```

Used to prevent thundering herd when multiple `GET /api/orders` requests run simultaneously.

---

## 2. Queue Ordering & Priority

Orders are sorted using this priority algorithm:

1. **VIP Orders (PENDING)** - Status value 0
2. **NORMAL Orders (PENDING)** - Status value 1
3. **Orders in PROCESSING** - Status value 2
4. **COMPLETE Orders** - Status value 3

Within each group:

- For PENDING orders: sorted by `orderNumber` (oldest first)
- Otherwise: sorted by creation time (newest first)

This ensures VIP orders are always processed first, regardless of when they were created.

---

## 3. Bot Assignment Flow

### Primary Assignment: `/api/bots/:id/claim`

When a bot is ready to work, it calls this endpoint to claim the next order.

**Flow:**

```
1. Bot: POST /api/bots/:id/claim

2. Server (transaction):
   a. Check bot is IDLE (not already processing)
   b. Find highest-priority PENDING order (VIP first, by orderNumber)
   c. If order exists:
      - Update order: status=PROCESSING, botId=bot.id, processingStartedAt=now()
      - Update bot: status=PROCESSING, currentOrderId=order.id
   d. Schedule QStash callback for 10 seconds later

3. Return claimed order (or null if none available)
```

**Key Features:**

- All updates happen in a **single database transaction** (prevents race conditions)
- Returns 409 Conflict if bot/order state changes during transaction
- Uses QStash deduplication to prevent duplicate completion callbacks

### Alternative: Manual Assignment via `/api/orders/:id`

You can manually assign a bot to an order:

```
PATCH /api/orders/{orderId}
{
  "status": "PROCESSING",
  "botId": "bot-uuid"
}
```

Validations:

- Bot must exist and be IDLE (unless reassigning to same bot)
- Order can't transition to PROCESSING if already being processed by a different bot

---

## 4. Queue Recovery & Resume Logic

### Server-Side Recovery (`GET /api/orders`)

When the `/api/orders` endpoint is called, it performs three critical operations:

#### a) Recover Stuck Bots

```typescript
Find bots where:
  - status = 'PROCESSING'
  - currentOrderId = null

Reset them to IDLE
// Bot crashed but DB still thinks they're working
```

#### b) Resume Processing Orders

```typescript
Find all orders where:
  - status = 'PROCESSING'

For each order:
  1. Calculate elapsed time since processingStartedAt
  2. If elapsed >= 10 seconds:
     - Mark order as COMPLETE (with status check to prevent double-completion)
     - Free the bot (set to IDLE)
  3. If elapsed < 10 seconds:
     - Schedule QStash callback for remaining time
     - Uses deduplication to prevent duplicates
```

This handles multiple failure scenarios gracefully.

**When is `resumeProcessingOrders()` needed?**

This function recovers from several fault conditions:

1. **Server Restart During Processing**
   - Order was claimed at 3s, server crashed at 7s
   - No QStash callback fired (server down)
   - On restart: See order still PROCESSING at elapsed=7s
   - Re-schedule QStash or complete directly if ≥10s

2. **QStash Failure (Service Down)**
   - Order claimed, QStash.publish() failed (caught but not retried)
   - Order stuck in PROCESSING with no scheduled callback
   - Next poll: Resume detects this and schedules callback

3. **QStash Callback Failed & Lost**
   - QStash fired, but callback returned error after server processed it
   - Order never marked COMPLETE due to transient error
   - Next poll: Resume detects elapsed≥10s and completes directly

4. **Network Disconnect Between Bot and Server**
   - Bot claimed order but connection dropped
   - No confirmation reached client
   - Order stuck in PROCESSING (QStash will eventually fire, but resume acts as backup)

5. **Partial Failure in Completion**
   - Order marked COMPLETE successfully
   - Bot update fails (bot was deleted, or constraint violation)
   - Next poll: Order already COMPLETE (status check prevents re-completion)
   - But resume might attempt cleanup

**Key Protection:** Status check in WHERE clause prevents double-completion even if multiple resume operations run concurrently.

#### c) Return Sorted Orders

Orders are returned in the priority order described in Section 2.

---

## 5. Order Completion

Orders are completed through two parallel mechanisms:

### Mechanism 1: QStash Callbacks (Server-Authoritative)

**Endpoint:** `POST /api/orders/complete`

```typescript
1. QStash sends signed request
2. Server validates QStash signature
3. Find order and check:
   - status = 'PROCESSING'
   - botId matches the one processing it
4. If valid:
   - Update order: status=COMPLETE, completedAt=now()
   - Update bot: status=IDLE, currentOrderId=null
5. Response is idempotent (safe to call multiple times)
```

QStash is scheduled with:

- Delay: 10 seconds (processing duration)
- DeduplicationId: Prevents duplicate callbacks if retried

### Mechanism 2: Client-Side Timers (For UI)

**File:** `pos/src/lib/bot-processor.ts`

```typescript
1. Leader bot processor starts 10-second countdown for each bot
2. Ticks timers every 100ms
3. When timer reaches 0:
   - Dispatches 'bot-order-complete' custom event
   - Updates bot state to IDLE in local store
   - Broadcasts to other tabs via BroadcastChannel
```

**Why both mechanisms?**

- QStash is the source of truth for persistent state
- Client-side timers provide instant UI feedback
- If QStash fails, server recovery (Section 4b) catches it

---

## 5.5. Stuck Bot Conditions & Prevention

While the system is designed to prevent stuck states, understanding failure modes is critical for debugging and admin operations.

### Recoverable Stuck States (Handled by Recovery)

#### State 1: PROCESSING Bot Without Order
```
bot.status = 'PROCESSING'
bot.currentOrderId = null
order = [no associated order]
```

**How it happens:**
- Order completion succeeds for order (status=COMPLETE)
- Bot update fails (network error, constraint violation, etc.)
- Bot left in PROCESSING state without knowing which order

**Recovery:** `recoverStuckBots()` finds these and resets to IDLE ✅

---

### Non-Recoverable Stuck States (Need Admin Action)

#### State 2: Processing a Deleted Order
```
bot.status = 'PROCESSING'
bot.currentOrderId = <deleted_order_id>
order.deletedAt ≠ null  (soft-deleted)
```

**How it happens:**
```
1. Bot claims order-123
2. Admin: DELETE /api/bots/:id
3. Order returns to PENDING, bot soft-deleted
4. BUT: Bot was processing a DIFFERENT order (order-456)
5. Then admin: DELETE /api/orders/:id (deleted_order_id = order-456)
6. Result: Deleted bot pointing to deleted order
```

**Why stuck:** `resumeProcessingOrders()` filters `WHERE deletedAt is null`, so deleted orders are ignored. No one completes the order or frees the bot.

**Prevention:**
- Don't delete bots or orders while they're actively being processed
- Use PATCH to transition bots to IDLE before deletion

**Manual recovery:**
```typescript
// Option 1: Restore order from deleted state
PATCH /api/orders/<deleted_order_id>
{ "deletedAt": null, "status": "PENDING" }

// Option 2: Hard-delete the orphaned data
DELETE FROM orders WHERE deletedAt IS NOT NULL
DELETE FROM bots WHERE deletedAt IS NOT NULL
```

---

#### State 3: Order Complete But Bot Not Updated ⚠️
```
order.status = 'COMPLETE'
bot.status = 'PROCESSING'
bot.currentOrderId = <completed_order_id>
```

**How it happens:**
- QStash callback fires and completes order ✓
- Bot update WHERE clause fails (bot was soft-deleted)
- Bot permanently stuck in PROCESSING

**Why not detected:**
- `recoverStuckBots()`: Bot HAS a currentOrderId (not null) → skipped
- `resumeProcessingOrders()`: Order NOT in PROCESSING → skipped
- **No recovery mechanism catches this state**

**Prevention:** Add status check when deleting bots
```typescript
// In DELETE /api/bots/:id:
// Don't delete bots that are actively PROCESSING
if (bot.status === 'PROCESSING' && bot.currentOrderId) {
  return Response.json(
    { error: 'Cannot delete bot currently processing an order' },
    { status: 409 }
  )
}
```

**Manual recovery:**
```typescript
// Manually reset bot to IDLE
PATCH /api/bots/<bot_id>
{ "status": "IDLE", "currentOrderId": null }

// Or hard-delete the orphaned data
DELETE FROM bots WHERE status = 'PROCESSING' AND deletedAt IS NOT NULL
```

---

### Timeline of Multiple Stuck States

```
Scenario: Order claimed → server crashes → callback never fires → restart → recovery

Timeline:
─────────────────────────────────────────────────────────────► Time

0s:   Bot claims order-123
      bot.status = PROCESSING, currentOrderId = order-123
      order.status = PROCESSING, processingStartedAt = 0s

5s:   💥 SERVER CRASH 💥
      QStash callback scheduled for 10s but server is down

10s:  QStash tries to fire but server still down
      QStash will retry later

20s:  🔄 SERVER RESTARTS 🔄

20s:  Client polls GET /api/orders
      → resumeProcessingOrders() runs
      → Finds order-123: elapsed=20s >= 10s
      → Completes order ✓
      → Frees bot ✓

Or if elapsed < 10s on restart:
      → Re-schedules QStash with new dedup ID (dedup prevents double-scheduling)
      → When QStash fires, completes order
```

---

### Summary: When Stuck States Occur

| State | Bot Status | Order Status | Detected By | Recoverable |
|-------|-----------|------------|------------|------------|
| Normal crash recovery | PROCESSING, no order | PROCESSING | recoverStuckBots | ✅ Yes |
| Deleted order | PROCESSING, deleted order | DELETED | None | ⚠️ Manual |
| Order complete but bot stuck | PROCESSING, COMPLETE order | COMPLETE | None | ⚠️ Manual |
| Server crash mid-processing | PROCESSING | PROCESSING | resumeProcessingOrders | ✅ Yes |
| QStash failure | PROCESSING | PROCESSING | resumeProcessingOrders | ✅ Yes |

---

## 6. Client-Side State Management

### Order Store (`pos/src/store/order.ts`)

Maintains in-memory cache of all orders:

```typescript
{
  orders: Order[]           // All orders
  pendingOrders: Order[]    // Filtered to PENDING
  processingOrders: Order[] // Filtered to PROCESSING
  completeOrders: Order[]   // Filtered to COMPLETE
}
```

- Syncs with server via React Query polling (2-second interval)
- Persists to localStorage for offline support
- Actions: setOrders, addOrder, updateOrder, removeOrder, clearOrders

### Bot Store (`pos/src/store/bot.ts`)

Tracks bot state including client-side timers:

```typescript
{
  bots: Map<botId, BotTimerState>
  isLeader: boolean        // Single-writer flag
}

type BotTimerState = {
  remainingMs: number      // Countdown timer
  status: 'IDLE' | 'PROCESSING'
  currentOrderId: string | null
  lastTick: number         // Last update timestamp
}
```

- Timer state is **local to browser tab only**
- Syncs main bot status from server via polling
- Leader election determines which tab processes timers

### Single-Writer Pattern (Bot Processor)

**File:** `pos/src/lib/bot-processor.ts`

Implements leader election to ensure only one tab processes timers:

```typescript
1. Each browser tab gets unique feedme-leader-id
2. Only tab holding feedme-leader-lease can process
3. Lease expires after 4 seconds (2x heartbeat interval)
4. BroadcastChannel notifies other tabs of leader changes
5. Leader ticks ALL bot timers every 100ms
6. Handles graceful takeover when leader tab closes
```

**Why?** Prevents duplicate timer operations across tabs while allowing any tab to become leader.

---

## 7. Cross-Tab Synchronization

### BroadcastChannel: `feedme-bot-sync`

Enables real-time communication between browser tabs:

```typescript
Messages:
- Leader election updates
- Bot state changes
- Order completion events
```

All tabs listen and update their local store accordingly.

### localStorage: Leader Lease

```
feedme-leader-lease: {
  leaderId: string
  expiresAt: timestamp
}
```

Ensures only one tab acts as leader at a time.

---

## 8. API Endpoints Reference

### Orders Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/orders` | GET | List all orders (with recovery & resume) |
| `/api/orders` | POST | Create new order |
| `/api/orders/:id` | PATCH | Update order (assign bot, change status) |
| `/api/orders/:id` | DELETE | Soft delete order |
| `/api/orders/complete` | POST | QStash callback - mark order complete |
| `/api/orders/clear` | * | Clear all orders |

### Bots Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/bots` | GET | List all bots |
| `/api/bots` | POST | Create new bot |
| `/api/bots/:id` | PATCH | Update bot (stop processing, etc.) |
| `/api/bots/:id` | DELETE | Soft delete bot (returns order to PENDING) |
| `/api/bots/:id/claim` | POST | Bot claims next order |

---

## 9. Complete Order Lifecycle Example

### Step 1: Create Order

Here's what happens from order creation to completion:

```
Client: POST /api/orders { type: "VIP" }
Server:
  - Allocates next orderNumber via sequence table
  - Creates order with status=PENDING
  - Returns order

Client: Fetches updated orders list
```

### Step 2: Bot Claims Order

```
Bot: POST /api/bots/bot-123/claim
Server (transaction):
  - Finds highest-priority PENDING order (VIP)
  - Updates order: status=PROCESSING, botId=bot-123
  - Updates bot: status=PROCESSING, currentOrderId=order-456
  - Schedules QStash callback for 10 seconds later
  - Returns order to bot

Client (polling): Sees order status changed to PROCESSING
```

### Step 3: Processing (Client-Side Display)

```
BotProcessor (leader tab):
  - Starts 10-second countdown for bot-123
  - Ticks every 100ms
  - UI shows progress bar counting down

Other tabs: See timer via BroadcastChannel sync
```

### Step 4: Order Completes

```
Option A - QStash Callback (Server-Authoritative):
  - 10 seconds later, QStash sends signed request
  - Server: order.status = COMPLETE, bot.status = IDLE

Option B - Client-Side (Immediate UI):
  - Timer reaches 0
  - Dispatches bot-order-complete event
  - Updates store to IDLE

Both mechanisms coordinate via server recovery
```

### Step 5: Next Cycle

```
Bot: POST /api/bots/bot-123/claim
Server: Finds next PENDING order (same process repeats)
```

---

## 10. Key Design Decisions

### Atomic Transactions

The `/api/bots/:id/claim` endpoint updates both the order and bot in a single transaction. This prevents:

- Race conditions where two bots claim the same order
- Inconsistent state if one update succeeds and the other fails

### Dual Completion Mechanisms

- **QStash**: Source of truth for persistent state
- **Client timers**: Provides instant UI feedback

This decoupling allows fast UI updates while maintaining data consistency through server recovery.

### Why QStash?

QStash (a job queue service) is used for scheduled order completion rather than relying solely on client-side timers or background jobs for several key reasons:

**1. Reliable Delivery**

- QStash guarantees message delivery with automatic retries and exponential backoff
- If an order completion callback fails, QStash will retry it until successful
- Eliminates the risk of orders getting "stuck" in PROCESSING state due to transient network errors

**2. Deduplication (Idempotency)**

- QStash's deduplication feature (via `DeduplicationId`) prevents duplicate completion messages
- If a bot crashes and restarts while an order is being completed, the duplicate won't cause issues
- The `/api/orders/complete` endpoint is safe to call multiple times with the same order

**3. Server Restart Resilience**

- If the server restarts between when an order starts processing and when 10 seconds elapse, QStash maintains the scheduled callback
- Client-side timers are lost on server restart, but QStash callbacks persist in the queue service
- When the server comes back up, the queued callback will still fire at the correct time

**4. Separation of Concerns**

- Processing completion is decoupled from the bot's network connection
- A bot can claim an order and disconnect; the server will complete it via QStash regardless
- Removes dependency on the bot staying connected for 10 seconds

**5. Observability & Debugging**

- QStash provides logs of all scheduled callbacks and their execution status
- Easy to verify that callbacks fired and when
- Helps troubleshoot why an order might be stuck in PROCESSING

**6. Fallback to Server Recovery**

- Even if QStash fails (rare), the `GET /api/orders` recovery mechanism (Section 4b) detects stuck orders after 10 seconds
- QStash is the preferred path, but recovery acts as a safety net
- This two-layer approach ensures orders eventually complete no matter what

### How QStash and Resume Logic Work Together

The system implements **three reliability layers** that work together to ensure orders complete successfully even in the face of failures:

#### Layer 1: Deduplication (Prevents Double-Scheduling)

The deduplication ID is based on the order's `processingStartedAt` timestamp:

```typescript
// Initial claim (bots/:id/claim)
deduplicationId: `${order.id}-${now.getTime()}`
// Sets processingStartedAt: now

// Resume logic (GET /api/orders)
deduplicationId: `${order.id}-${startedAtMs}`
// Uses SAME processingStartedAt from database
```

**Result:** Both use identical deduplication IDs, so:
- Initial claim schedules callback with ID `order-123-1674567890000`
- Server restarts and resume logic tries to schedule again
- QStash ignores the duplicate (same dedup ID)
- No duplicate callbacks scheduled

#### Layer 2: QStash Automatic Retries (Handles Transient Failures)

QStash retries are for when the `/api/orders/complete` endpoint **fails**:
- QStash sends callback → endpoint returns 500/network error
- QStash automatically retries with exponential backoff
- Same callback, same payload, same dedup ID
- Keeps retrying until it gets a success response

#### Layer 3: Idempotent Endpoint (Safe Multiple Calls)

The `/api/orders/complete` endpoint is designed to be called multiple times safely:

```typescript
if (
  !order ||
  order.status !== 'PROCESSING' ||
  order.botId !== payload.botId
) {
  return Response.json({ message: 'Order already finalized' })
}
```

If the order is already complete, it returns success without erroring.

#### Failure Scenarios

**Scenario 1: Normal Flow**

```
Timeline:
0s ────────────────────────────────► 10s
   Bot Claims         QStash Fires
      |                    |
      v                    v
   [PROCESSING]       [COMPLETE]

Flow:
┌──────┐  POST /claim   ┌────────┐
│ Bot  │───────────────>│ Server │
└──────┘                └────────┘
                             │
                             │ 1. Set order.status = PROCESSING
                             │ 2. Schedule QStash for 10s
                             │    dedup: order-123-1674567890000
                             v
                        ┌────────┐
                        │ QStash │
                        └────────┘
                             │
                        (10s later)
                             │
                             v
                        ┌────────┐  POST /complete  ┌────────┐
                        │ QStash │─────────────────>│ Server │
                        └────────┘                  └────────┘
                                                         │
                                                         │ Set order.status = COMPLETE
                                                         │ Set bot.status = IDLE
                                                         v
                                                      [DONE ✓]
```

**Scenario 2: Callback Fails (Network Error)**

```
Timeline:
0s ────────────────► 10s ─────► 11s ────► 12s
   Bot Claims      1st Try   Retry 1   Success
                   (fails)

Flow:
                        ┌────────┐  POST /complete  ┌────────┐
                        │ QStash │─────────────────>│ Server │
                        └────────┘                  └────────┘
                             │                           X
                             │                      (500 error)
                             │
                             │ QStash detects failure
                             │ Waits (exponential backoff)
                             │
                             v
                        ┌────────┐  POST /complete  ┌────────┐
                        │ QStash │─────────────────>│ Server │
                        └────────┘   (retry)        └────────┘
                                                         │
                                                         v
                                                      [DONE ✓]

Key: QStash automatically retries until success
     Same dedup ID prevents duplicate scheduling
```

**Scenario 3: Server Restarts Before Callback**

```
Timeline:
0s ───────► 3s ──────────────────► 10s
   Claim    Restart    Resume     Original Callback

Flow:
┌──────┐  POST /claim   ┌────────┐
│ Bot  │───────────────>│ Server │
└──────┘                └────────┘
                             │
                             │ Schedule QStash callback
                             │ dedup: order-123-1674567890000
                             v
                        ┌────────┐
                        │ QStash │ (callback queued for 10s)
                        └────────┘

                        💥 SERVER RESTARTS 💥

                        ┌────────┐  GET /orders    ┌────────┐
                        │ Client │────────────────>│ Server │
                        └────────┘                 └────────┘
                                                        │
                                                        │ resumeProcessingOrders()
                                                        │ - Find order in PROCESSING
                                                        │ - Elapsed: 3s
                                                        │ - Remaining: 7s
                                                        │ - Try schedule QStash
                                                        │   dedup: order-123-1674567890000
                                                        v
                                                   ┌────────┐
                                                   │ QStash │
                                                   └────────┘
                                                        │
                                                        │ DUPLICATE dedup ID!
                                                        │ Ignore new schedule
                                                        v
                                                   (No action)

                        (Original callback still queued)
                             │
                        (at 10s mark)
                             │
                             v
                        ┌────────┐  POST /complete  ┌────────┐
                        │ QStash │─────────────────>│ Server │
                        └────────┘                  └────────┘
                                                         │
                                                         v
                                                      [DONE ✓]

Key: Deduplication prevents double-scheduling
     Original QStash callback completes the order
```

**Scenario 4: Server Restarts After Callback Should Have Fired**

```
Timeline:
0s ───────► 5s ──────────────────────► 15s
   Claim    Crash          Server Back + Resume

Flow:
┌──────┐  POST /claim   ┌────────┐
│ Bot  │───────────────>│ Server │
└──────┘                └────────┘
                             │
                             │ Schedule QStash for 10s
                             v
                        ┌────────┐
                        │ QStash │ (callback at 10s)
                        └────────┘

                        💥 SERVER CRASHES 💥
                        (before 10s callback)

                        (10s mark passes)
                        ┌────────┐  POST /complete  ╳╳╳╳╳╳╳╳
                        │ QStash │─────────────────> (server down)
                        └────────┘                  ╳╳╳╳╳╳╳╳
                             │
                             │ QStash will retry later
                             v
                        (queued for retry)

                        🔄 SERVER RESTARTS 🔄

                        ┌────────┐  GET /orders    ┌────────┐
                        │ Client │────────────────>│ Server │
                        └────────┘                 └────────┘
                                                        │
                                                        │ resumeProcessingOrders()
                                                        │ - Find order in PROCESSING
                                                        │ - Elapsed: 15s (>= 10s!)
                                                        │ - DIRECTLY COMPLETE ORDER
                                                        │   • order.status = COMPLETE
                                                        │   • bot.status = IDLE
                                                        │ - DON'T schedule QStash
                                                        v
                                                     [DONE ✓]

                        (Later: QStash retry fires)
                        ┌────────┐  POST /complete  ┌────────┐
                        │ QStash │─────────────────>│ Server │
                        └────────┘                  └────────┘
                                                         │
                                                         │ Check: status != PROCESSING
                                                         │ Return success (idempotent)
                                                         v
                                                      (No-op)

Key: Resume detects overdue orders and completes them
     Idempotent endpoint ignores late callbacks
```

**Scenario 5: QStash Service Down**

```
Timeline:
0s ────────────────────────────► Later
   Claim (QStash fails)        Resume Completes

Flow:
┌──────┐  POST /claim   ┌────────┐
│ Bot  │───────────────>│ Server │
└──────┘                └────────┘
                             │
                             │ 1. Transaction: set PROCESSING
                             │ 2. Try schedule QStash
                             v
                        ╳╳╳╳╳╳╳╳
                        ╳QStash╳ (service down!)
                        ╳╳╳╳╳╳╳╳
                             │
                             │ publish() throws error
                             v
                        ┌────────┐
                        │ Server │
                        └────────┘
                             │
                             │ Catch error (line 130-133)
                             │ Log warning
                             │ DON'T fail the claim
                             │ Return success to bot
                             v
                        Order in PROCESSING
                        But no QStash callback!

                        (Later: polling or manual trigger)
                        ┌────────┐  GET /orders    ┌────────┐
                        │ Client │────────────────>│ Server │
                        └────────┘                 └────────┘
                                                        │
                                                        │ resumeProcessingOrders()
                                                        │ - Find order in PROCESSING
                                                        │
                                                        │ If elapsed >= 10s:
                                                        │   Complete directly
                                                        │
                                                        │ If elapsed < 10s:
                                                        │   Try schedule QStash
                                                        │   (might work if back up)
                                                        v
                                                     [DONE ✓]

Key: Resume mechanism acts as fallback
     System continues working even if QStash fails
```

#### Summary: Complementary, Not Redundant

- **QStash Retries**: Handle when the callback endpoint fails temporarily
- **Resume Mechanism**: Handle when the server restarts and loses in-memory state
- **Deduplication**: Prevents both mechanisms from creating duplicate callbacks
- **Idempotency**: Ensures multiple completions don't cause data corruption

Together they provide bulletproof order completion:
- Retries = "callback failed, try again"
- Resume = "server restarted, re-schedule what was lost"
- Result = Orders always complete, no matter what fails

### Single-Writer Pattern

Only one browser tab processes bot timers at a time. This prevents:

- Duplicate timer operations
- Race conditions in localStorage
- Multiple tabs trying to claim the same order

### Server Recovery

Automatic detection and recovery of stuck bots and incomplete orders ensures the system remains consistent even after crashes.

### Priority Queue with VIP Support

VIP orders always take precedence over NORMAL orders regardless of creation order. Within each priority level, FIFO ordering is maintained.

### Concurrent Request Handling (GET /api/orders)

Multiple clients polling `GET /api/orders` simultaneously could cause race conditions. The system implements several protections:

#### 1. Distributed Lock for Resume Operations

A `resume_locks` table prevents thundering herd when multiple requests try to run `resumeProcessingOrders()` at the same time:

```typescript
// resume_locks table
{
  id: 'resume_processing'   // Lock identifier
  lockedAt: timestamp       // When lock was acquired
  expiresAt: timestamp      // Lock auto-expires after 5 seconds
}
```

**How it works:**
1. Before running resume logic, try to acquire lock
2. Update lock row WHERE `expiresAt < now` (lock expired)
3. If update succeeds → lock acquired, proceed with resume
4. If update fails → lock held by another request, skip resume
5. Lock auto-expires after 5 seconds (no explicit release needed)

**Benefits:**
- Only one request runs resume logic at a time
- Prevents redundant database updates
- Fail-open design (if lock mechanism fails, resume still runs)

#### 2. Status Check in WHERE Clause

Order completion includes status check to prevent redundant updates:

```typescript
// Before (vulnerable to race)
.where(eq(orders.id, order.id), isNull(orders.deletedAt))

// After (protected)
.where(
  eq(orders.id, order.id),
  eq(orders.status, 'PROCESSING'),  // Added
  isNull(orders.deletedAt)
)
```

If two requests try to complete the same order:
- First request: `PROCESSING → COMPLETE` ✓
- Second request: WHERE clause fails (status already COMPLETE), 0 rows updated

#### 3. Bot Update Protection

Bot updates already check current status:

```typescript
.where(
  eq(bots.id, order.botId),
  eq(bots.currentOrderId, order.id),
  eq(bots.status, 'PROCESSING'),  // Must be PROCESSING
  isNull(bots.deletedAt)
)
```

Only the first request succeeds; subsequent requests update 0 rows.

#### Race Condition Protection Summary

| Issue | Protection Mechanism |
|-------|---------------------|
| Multiple resume operations | Distributed lock with TTL |
| Double order completion | Status check in WHERE clause |
| Double bot status update | Status check in WHERE clause |
| QStash double-scheduling | Deduplication by ID |
| Late QStash callbacks | Idempotent endpoint |

---

## 11. Constant Configuration

**Processing Duration:** `BOT_PROCESSING_DELAY_SECONDS = 10`

Used consistently across:

- QStash scheduling delay
- Client-side timer countdown
- Server recovery detection

This ensures all components agree on how long an order takes to process.

**Resume Lock TTL:** `RESUME_LOCK_TTL_SECONDS = 5`

- How long the distributed lock is held before auto-expiring
- Short enough to not block legitimate requests for long
- Long enough to cover the resume operation duration

---

## Summary

The orders → bot queue system is a robust, scalable architecture that combines:

1. **Database transactions** for atomic state changes
2. **Priority queuing** with VIP support
3. **Distributed timers** across browser tabs with leader election
4. **Server-side recovery** for fault tolerance
5. **Dual completion mechanisms** for reliability and responsiveness
6. **Distributed locking** to prevent concurrent resume operations

The result is a system that gracefully handles crashes, prevents race conditions, provides instant UI feedback, and maintains strong data consistency.
