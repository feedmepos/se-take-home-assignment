# FeedMe Order Management System — Design Document

## 1. Architecture Overview

```
cmd/demo/main.go          cmd/interactive/main.go
         |                        |
         +----------+-------------+
                    |
            internal/controller
            /        |        \
     model/       queue/      bot/
```

- **`cmd/demo/main.go`**: Scripted demo entry point, runs a fixed scenario, outputs `result.txt`, used directly by CI
- **`cmd/interactive/main.go`**: Interactive CLI entry point, reads commands from stdin for live interview demonstration
- **`internal/controller`**: Core orchestration layer, owns Queue and Bot collection, coordinates order assignment and Bot lifecycle
- **`internal/model`**: `Order`, `Bot`, status constants, and shared types
- **`internal/queue`**: VIP-first, same-priority FIFO order queue
- **`internal/bot`**: Single Bot lifecycle (IDLE → PROCESSING → COMPLETE/ROLLBACK)

**Dependency direction**: `controller` → `queue` + `bot` + `model`; `bot` → `model`; `queue` → `model`. `queue` and `bot` do not depend on each other.

## 2. Data Model

### 2.1 Order

```go
type OrderType int

const (
    OrderNormal OrderType = iota
    OrderVIP
)

type OrderStatus int

const (
    StatusPending    OrderStatus = iota // waiting to be processed
    StatusProcessing                    // being processed by a Bot
    StatusComplete                      // completed
)

type Order struct {
    ID          int         // globally unique, auto-incrementing
    Type        OrderType
    Status      OrderStatus
    CreatedAt   time.Time
    CompletedAt time.Time   // zero value means not completed
}
```

**Rules**:
- IDs start at 1001 and auto-increment (reference `result.txt` examples), ensuring uniqueness and monotonic increase
- Status = PENDING on creation
- Status = PROCESSING when picked up by a Bot
- Status = COMPLETE and `CompletedAt` recorded when processing finishes
- Status reverts to PENDING when a Bot is destroyed causing a rollback

### 2.2 Bot

```go
type BotStatus int

const (
    BotIdle       BotStatus = iota // idle, waiting for orders
    BotProcessing                  // processing an order
)

type Bot struct {
    ID           int
    Status       BotStatus
    CurrentOrder *Order    // order currently being processed, nil when idle
    CreatedAt    time.Time
    stopCh       chan struct{} // internal cancellation channel
}
```

**Rules**:
- Bot IDs start at 1 and auto-increment
- Each Bot has an internal goroutine that uses `stopCh` to make the 10-second wait interruptible
- `+ Bot` creates a new Bot; if the queue is non-empty, immediately picks up an order; otherwise enters IDLE
- `- Bot` destroys the **most recently created Bot** (LIFO); if that Bot is processing an order, interrupts via `stopCh` and rolls the order back to PENDING

### 2.3 Output Format

Each line in `result.txt`:

```
[HH:MM:SS] <event description>
```

Example event types:
- `[14:32:01] System initialized with 0 bots`
- `[14:32:01] Created Normal Order #1001 - Status: PENDING`
- `[14:32:02] Created VIP Order #1002 - Status: PENDING`
- `[14:32:03] Bot #1 created - Status: ACTIVE`
- `[14:32:03] Bot #1 picked up VIP Order #1002 - Status: PROCESSING`
- `[14:32:13] Bot #1 completed VIP Order #1002 - Status: COMPLETE (Processing time: 10s)`
- `[14:32:25] Bot #2 destroyed while IDLE`
- `[14:32:25] Bot #1 is now IDLE - No pending orders`

Timestamps are taken from the system clock with second-level precision. This requires the demo scenario design to allow sufficient operation intervals.

## 3. Core Data Structure: PriorityQueue

### 3.1 Design

```go
type PriorityQueue struct {
    vipQ    []*model.Order   // VIP orders, FIFO
    normalQ []*model.Order   // Normal orders, FIFO
    nextID  int              // next order ID
}
```

> **Thread safety**: PriorityQueue itself does not lock. All concurrency protection is handled by the Controller's single Mutex. Queue methods assume the caller already holds the lock.

### 3.2 Operations

| Operation | Behavior |
|------|------|
| `Enqueue(o)` | Appends to the tail of `vipQ` or `normalQ` based on `o.Type` |
| `Dequeue()` | If `vipQ` is non-empty, returns the head VIP order; otherwise returns the head of `normalQ` |
| `RollbackToFront(o)` | Inserts the order at the **head** of its corresponding priority queue (preserving original position semantics) |
| `Peek()` | Views the next order without removing it |
| `Len()` | Returns the total number of PENDING orders in the queue |
| `IsEmpty()` | Returns whether the queue is empty |

**Key semantic: `RollbackToFront`**

When a Bot is destroyed while processing an order, the order is not appended to the tail of the queue but inserted back at the head of its corresponding priority queue:

- VIP order rollback → inserted at the head of `vipQ` (immediately before the current VIP orders)
- Normal order rollback → inserted at the head of `normalQ` (immediately before the current Normal orders)

This corresponds to the README requirement: "return to its original position in the PENDING area (maintaining VIP/Normal order priority)". Since same-priority ordering is FIFO, the "original position" is the front of that priority queue.

## 4. Bot Lifecycle

### 4.1 State Machine

```
           +Bot created
              |
              v
          +-------+
    +---->| IDLE  |<-------------+
    |     +-------+              |
    |         |                  |
    |   Queue has orders?        | Order taken
    |         |               but Bot destroyed
    |         v                  |
    |     +-----------+         |
    |     | PROCESSING |--------+
    |     +-----------+
    |         |
    |    After 10s
    |         |
    |         v
    |    Order completed
    |    (output COMPLETE)
    |         |
    +---------+
     Queue has more orders?
     Yes → take next
     No  → return to IDLE
```

### 4.2 Interruptible 10-Second Processing

```go
// process receives an independent doneCh, created by the caller via the newTimer() factory.
func (b *Bot) process(order *model.Order, doneCh <-chan time.Time) {
    select {
    case <-doneCh:
        // Normal completion → notify Controller order is done
        b.onComplete(order)
    case <-b.stopCh:
        // Bot destroyed → notify Controller to rollback
        b.onRollback(order)
    }
}
```

### 4.2.1 Timer Injection Design (Independent Channel / Factory Pattern)

**Core principle: Each Bot holds an independent timer channel. Cross-Bot sharing is forbidden.**

**Why independent channels?**

In multi-Bot scenarios, if all Bots share a single `doneCh`, after `RemoveBot` destroys one Bot, its goroutine exits from `select`, but the shared `doneCh` is still being listened to by other Bots. Subsequent sends to `doneCh` face an uncertain receiver (a destroyed goroutine may compete with an active goroutine for the signal), causing the signal to be "swallowed" — the active Bot never receives the completion notification, and the order is stuck in PROCESSING.

**Design: Factory pattern**

```
                  Controller
                      |
              newTimer func() <-chan time.Time
                      |
         +------------+-----------+
         |            |           |
       Bot#1        Bot#2       Bot#3
      doneCh#1     doneCh#2    doneCh#3
     (independent)(independent)(independent)
```

- **`Controller`** holds a `newTimer func() <-chan time.Time` factory function
  - Production: `func() <-chan time.Time { return time.After(10 * time.Second) }`
  - Test: replaced with a controllable channel factory
- **`Bot.Assign(order, doneCh)`**: On each call, Controller invokes `newTimer()` to generate a **brand-new independent channel** and passes it to the Bot
- Each Bot's `process()` goroutine only listens on its own `doneCh` and `stopCh`, with no interference

**Test counterpart: `testTimer` implementation**:

```go
type testTimer struct {
    mu       sync.Mutex
    channels []chan time.Time  // FIFO queue
}

func (tt *testTimer) newTimer() <-chan time.Time {
    ch := make(chan time.Time, 1)
    tt.mu.Lock()
    tt.channels = append(tt.channels, ch)  // append to tail
    tt.mu.Unlock()
    return ch
}

func (tt *testTimer) trigger() {
    tt.mu.Lock()
    if len(tt.channels) > 0 {
        ch := tt.channels[0]
        tt.channels = tt.channels[1:]      // dequeue from head
        ch <- time.Now()
    }
    tt.mu.Unlock()
}
```

- Each `Assign` calls `newTimer()` to create a new channel, appended to the queue tail
- `trigger()` dequeues the earliest channel and sends a signal (FIFO, ensuring the earliest-assigned Bot finishes first)
- **Orphan channel handling**: After `RemoveBot` destroys a Bot, its timer channel remains in the queue. The test must explicitly call `trigger()` once to consume it, ensuring subsequent triggers reach the correct active Bot

### 4.2.2 Testing Strategy

Use injectable timers (controllable channels) in unit tests to accelerate time and verify both completion and interruption paths.

### 4.3 Idle Bot Wake-Up

When a new order is enqueued, Controller iterates over all IDLE Bots in creation order and assigns orders:

```
Controller.AddOrder(order):
    queue.Enqueue(order)
    for each bot in bots (sorted by ID ascending):
        if bot.Status == IDLE:
            order = queue.Dequeue()
            bot.Assign(order)
```

## 5. Controller Orchestration

### 5.1 Responsibilities

`Controller` is the single orchestration entry point, holding a `PriorityQueue` and `[]*Bot`. All public methods are concurrency-safe (internally protected by `sync.Mutex`).

### 5.2 Public Methods

```go
type Controller struct {
    mu     sync.Mutex
    queue  *queue.PriorityQueue
    bots   []*bot.Bot
    nextBotID int
    // writer for result output
    resultWriter io.Writer
}
```

| Method | Behavior |
|------|------|
| `AddNormalOrder()` | Creates a Normal Order → enqueues to PENDING → attempts to assign IDLE Bots |
| `AddVIPOrder()` | Creates a VIP Order → enqueues to PENDING (tail of VIP queue) → attempts to assign IDLE Bots |
| `AddBot()` | Creates a new Bot → if queue is non-empty, dequeues and assigns; otherwise Bot enters IDLE |
| `RemoveBot()` | Finds the newest Bot (LIFO) → if PROCESSING, stops via `stopCh` + rolls order back to queue head → removes from bots list |
| `Status()` | Returns current system status summary (optional, for interactive CLI) |

### 5.3 Assignment Logic

`assignPendingToIdleBots()` is an internal method called at the following times:
- After `AddNormalOrder` / `AddVIPOrder`
- After a Bot completes an order (Bot notifies Controller via callback)

```go
func (c *Controller) assignPendingToIdleBots() {
    for _, b := range c.bots {
        if b.Status == BotIdle && !c.queue.IsEmpty() {
            order := c.queue.Dequeue()
            b.Assign(order) // async goroutine starts 10s processing
        }
    }
}
```

### 5.4 Bot Callbacks

Bots communicate with the Controller via callback functions, avoiding the Bot package depending on the Controller package:

```go
type BotCallbacks struct {
    OnComplete func(order *model.Order)
}
```

Controller injects callbacks when creating Bots:
- `OnComplete`: Order completed → write result event → call `assignPendingToIdleBots()`

Rollback situations are handled directly by the `RemoveBot()` method, not through callbacks.

## 6. Concurrency Model

### 6.1 Locking Strategy

Simplified approach: **only the Controller holds a single `sync.Mutex`**.

- Queue and Bot do not lock themselves; all concurrency protection is centralized at the Controller layer
- All public methods (`AddNormalOrder`, `AddVIPOrder`, `AddBot`, `RemoveBot`) first `Lock()` then `defer Unlock()`
- Goroutines inside Bots communicate with the Controller via channels (callbacks), not touching shared state directly
- Single entry point, single lock, no deadlock risk

### 6.2 Goroutine Management

Each Bot's `process()` runs in an independent goroutine:
- Create Bot + orders available → start goroutine
- Bot completes an order → if more orders exist, start a new goroutine to process the next
- Bot destroyed → close goroutine via `stopCh`

The Controller does not need to maintain a WaitGroup for goroutines. In Demo mode, the main goroutine just waits enough time before exiting.

## 7. Demo Scenario Design

### 7.1 Scenario

Based on the existing reference output in `scripts/result.txt`, design a deterministic scenario covering all requirements:

| Time Offset | Operation | Expected Effect |
|---------|------|---------|
| 0s | System initialized | 0 bots, 0 orders |
| 0s | + Normal #1001 | PENDING |
| 1s | + VIP #1002 | PENDING (ahead of #1001) |
| 1s | + Normal #1003 | PENDING (behind VIP, behind #1001) |
| 2s | + Bot #1 | Picks up VIP #1002 → PROCESSING |
| 3s | + Bot #2 | Picks up Normal #1001 → PROCESSING |
| 12s | — | Bot #1 completes VIP #1002 → COMPLETE; picks up Normal #1003 |
| 13s | — | Bot #2 completes Normal #1001 → COMPLETE; queue empty → IDLE |
| 14s | + VIP #1004 | PENDING → Bot #2 picks up immediately |
| 22s | — | Bot #1 completes Normal #1003 → COMPLETE; queue empty → IDLE |
| 24s | — | Bot #2 completes VIP #1004 → COMPLETE |
| 24s | - Bot #2 | Destroyed (IDLE, no rollback) |
| 26s | — | Bot #1 IDLE |

### 7.2 Implementation

In `cmd/demo/main.go`, use `time.Sleep` to control event intervals (e.g., `sleep(1s)` corresponds to 1 second offset). Note that `time.Sleep` is not precise, but second-level accuracy is sufficient.

## 8. Interactive CLI Design

### 8.1 Command Set

```
new normal         — Create a Normal Order
new vip            — Create a VIP Order
+ bot              — Add a Bot
- bot              — Remove a Bot
status             — View current system status
exit               — Exit
```

### 8.2 Implementation

`cmd/interactive/main.go` reads commands line by line from stdin and calls the corresponding Controller methods. After each command execution, it immediately prints the current status (non-blocking — the next command can be entered without waiting for the Bot's 10-second processing).

Timestamps use real system time. COMPLETE events are automatically output during processing.

## 9. Time Estimation

| Work Item | Estimated Time |
|-------|---------|
| `internal/model` type definitions | 5 min |
| `internal/queue` + unit tests | 10 min |
| `internal/bot` + unit tests | 10 min |
| `internal/controller` + integration tests | 15 min |
| `cmd/demo` scripted demo | 5 min |
| `cmd/interactive` interactive CLI | 5 min |
| `scripts/` refinement | 5 min |
| Documentation | 5 min |
| **Total** | **~60 min** |

---

> Detailed test plan: see [`docs/test.md`](./test.md).
