# FeedMe Order Management System — Test Document

> **Usage**: For each workflow, write tests first (red), then implement the feature (green).
> Workflow numbers correspond to `docs/todo.md`.

---

## Workflow 1: model + queue

**Corresponding todos**: 1.1 types.go → 1.2 queue.go → 1.3 queue_test.go

**Implementation order**: Write `types.go` first (pure types, no tests), then **write `queue_test.go`**, and finally implement `queue.go`.

### Test file: `internal/queue/queue_test.go`

### 1.1 Empty Queue

| # | Case | Operation | Assertion |
|---|------|------|------|
| 1 | Empty queue IsEmpty | `q := NewQueue()` | `q.IsEmpty() == true` |
| 2 | Empty queue Len | `q := NewQueue()` | `q.Len() == 0` |
| 3 | Empty queue Dequeue returns nil | `q := NewQueue()` | `q.Dequeue() == nil` |

### 1.2 Single-Type Enqueue/Dequeue

| # | Case | Operation | Assertion |
|---|------|------|------|
| 4 | Normal enqueue then Dequeue | `q.Enqueue(normal)` → `o := q.Dequeue()` | `o.Type == Normal` |
| 5 | VIP enqueue then Dequeue | `q.Enqueue(vip)` → `o := q.Dequeue()` | `o.Type == VIP` |
| 6 | IsEmpty false after enqueue | `q.Enqueue(normal)` | `q.IsEmpty() == false` |
| 7 | Len correct after enqueue | `q.Enqueue(normal)`; `q.Enqueue(vip)` | `q.Len() == 2` |

### 1.3 VIP Priority

| # | Case | Operation Sequence | Dequeue Order Assertion |
|---|------|---------|------------|
| 8 | VIP before Normal | Enqueue(Normal) → Enqueue(VIP) | Dequeue 1st=VIP, 2nd=Normal |
| 9 | Normal cannot jump between VIPs | Enqueue(VIP) → Enqueue(Normal) → Enqueue(VIP) | VIP → VIP → Normal |

### 1.4 Same-Priority FIFO

| # | Case | Operation Sequence | Dequeue Order Assertion |
|---|------|---------|------------|
| 10 | FIFO within VIP | Enqueue(VIP#1) → Enqueue(VIP#2) | VIP#1 → VIP#2 |
| 11 | FIFO within Normal | Enqueue(Normal#1) → Enqueue(Normal#2) | Normal#1 → Normal#2 |

### 1.5 RollbackToFront (rollback to head of same priority)

| # | Case | Operation Sequence | Assertion |
|---|------|---------|------|
| 12 | VIP rollback still at front of VIP | Enqueue(VIP#2) → Dequeue VIP#2 → RollbackToFront(VIP#2) → Enqueue(VIP#3) | Dequeue order: VIP#2 → VIP#3 |
| 13 | Normal rollback still at front of Normal | Enqueue(Normal#1) → Dequeue → RollbackToFront(Normal#1) → Enqueue(Normal#2) | Dequeue order: Normal#1 → Normal#2 |
| 14 | Normal rollback does not affect VIP | Enqueue(VIP#1) → Enqueue(Normal#1) → Dequeue VIP#1 → RollbackToFront(VIP#1) | VIP#1 still ahead of Normal#1 |

> **Total**: 14 cases. `NewQueue` must expose a constructor, `Dequeue` returns `*model.Order`.

---

## Workflow 2: Bot Lifecycle

**Corresponding todos**: 2.1 bot.go → 2.2 bot_test.go

**Implementation order**: Write **`bot_test.go`** first, then implement `bot.go`.

**Timer injection**: Bot's `process()` method signature is `process(order, doneCh <-chan time.Time)`.

- **Production**: Controller passes `time.After(10*time.Second)` via `newTimer` factory
- **Test**: `newTimer` replaced with a controllable channel factory, **each Bot gets an independent channel**, and sending a value to the channel simulates the "10 seconds elapsed" event
- **No sharing**: Multiple Bots sharing one `doneCh` is not supported — it causes destroyed goroutines to compete with active goroutines for signals, causing intermittent test failures

### Test file: `internal/bot/bot_test.go`

### 2.1 New Bot

| # | Case | Operation | Assertion |
|---|------|------|------|
| 1 | New Bot status is IDLE | `b := NewBot(1, nil)` | `b.Status == IDLE` |
| 2 | New Bot has no current order | `b := NewBot(1, nil)` | `b.CurrentOrder == nil` |

### 2.2 Assign (Assign Order)

| # | Case | Operation | Assertion |
|---|------|------|------|
| 3 | IDLE Bot enters PROCESSING after Assign | `b.Assign(order, doneCh)` | `b.Status == PROCESSING` |
| 4 | CurrentOrder correct after Assign | `b.Assign(order, doneCh)` | `b.CurrentOrder == order` |
| 5 | PROCESSING Bot re-Assign returns error | assign first, then assign another | returns `error != nil` |

### 2.3 Normal Completion

| # | Case | Operation | Assertion |
|---|------|------|------|
| 6 | OnComplete callback called after timer fires | assign → close(doneCh) | `onCompleteCalled == true`, order correct |
| 7 | Bot returns to IDLE after completion (if callback sets) | close(doneCh) → reset in callback | `b.Status == IDLE`, `b.CurrentOrder == nil` |

### 2.4 Interruption (stopCh)

| # | Case | Operation | Assertion |
|---|------|------|------|
| 8 | OnComplete not called after stopCh closed | assign → close(stopCh) | `onCompleteCalled == false` |
| 9 | Bot reusable after stopCh closed (re-assign) | assign → close(stopCh) → assign | second assign succeeds |

### 2.5 Stop IDLE Bot

| # | Case | Operation | Assertion |
|---|------|------|------|
| 10 | Stopping IDLE Bot has no side effects | `b.Stop()` | no panic, Status still IDLE |

> **Total**: 10 cases. Depends on `internal/model` package (no circular dependency).

---

## Workflow 3: Controller Orchestration

**Corresponding todos**: 3.1 controller.go → 3.2 controller_test.go

**Implementation order**: Write **`controller_test.go`** first, then implement `controller.go`.

**Timer injection**: Controller accepts `newTimer func() <-chan time.Time` factory function at construction.

| Environment | `newTimer` Implementation | Trigger Method |
|------|----------------|---------|
| Production | `func() <-chan time.Time { return time.After(10*time.Second) }` | Real 10-second wait |
| Test | `testTimer.newTimer()` (returns new channel each time, pushed to FIFO queue) | `testTimer.trigger()` sends signal to queue head channel |

**Independent channel + FIFO trigger rules**:
- Each `Bot.Assign()` calls `newTimer()` to get an **independent** channel, appended to the `testTimer` internal queue tail
- `trigger()` dequeues the earliest channel from the head and sends a signal, ensuring the earliest-assigned Bot finishes first
- **Orphan channel cleanup**: After `RemoveBot` destroys a Bot, its channel remains in the queue. The test must explicitly call `trigger()` once after `RemoveBot` to consume it; otherwise subsequent triggers will mistakenly reach the orphan channel

### Test file: `internal/controller/controller_test.go`

### 3.1 Order Creation

| # | Case | Operation | Assertion |
|---|------|------|------|
| 1 | AddNormalOrder creates Normal order | `c.AddNormalOrder()` | 1 Normal in queue, ID increments |
| 2 | AddVIPOrder creates VIP order | `c.AddVIPOrder()` | 1 VIP in queue |
| 3 | Multiple creates have incrementing IDs | AddNormal → AddVIP → AddNormal | IDs are 1001, 1002, 1003 |

### 3.2 Bot Creation and Auto-Assignment

| # | Case | Operation | Assertion |
|---|------|------|------|
| 4 | +Bot immediately picks up when PENDING exists | Enqueue VIP → AddBot | Bot#1 PROCESSING, PENDING-1 |
| 5 | VIP picked up first | Enqueue Normal → Enqueue VIP → AddBot | Bot picked up VIP |
| 6 | +Bot enters IDLE when no PENDING | AddBot (empty queue) | Bot#1 IDLE, 1 bot in list |

### 3.3 IDLE Bot Auto Wake-Up

| # | Case | Operation | Assertion |
|---|------|------|------|
| 7 | New order wakes IDLE Bot | AddBot (empty) → AddNormalOrder | Bot auto-picks up order, enters PROCESSING |

### 3.4 Order Completion and Handoff

| # | Case | Operation | Assertion |
|---|------|------|------|
| 8 | Bot auto-picks next after completion | Enqueue VIP → Enqueue Normal → AddBot → trigger timer | Both orders COMPLETE, VIP first then Normal |
| 9 | Bot returns to IDLE when queue empty after completion | Enqueue 1 order → AddBot → trigger timer | Bot returns to IDLE |

### 3.5 Bot Removal and Rollback

| # | Case | Operation | Assertion |
|---|------|------|------|
| 10 | Remove IDLE Bot | AddBot (empty) → RemoveBot | bots list empty |
| 11 | Remove PROCESSING Bot, order rolls back to PENDING | Enqueue VIP → AddBot → RemoveBot | VIP back to PENDING, 1 PENDING in queue |
| 12 | Remove newest Bot (LIFO) | Queue has 2 orders → AddBot → AddBot → RemoveBot | Bot#2 removed, Bot#1 kept |
| 13 | Priority preserved after rollback | Enqueue VIP → Enqueue Normal → AddBot → AddBot → RemoveBot (Bot#2 processing Normal) | Normal rolled back, VIP still ahead of Normal |

### 3.6 End-to-End Full Scenario (one table-driven test)

```
Operation Sequence:
  AddNormalOrder               → pending: [N#1001]
  AddVIPOrder                  → pending: [V#1002, N#1001]
  AddNormalOrder               → pending: [V#1002, N#1001, N#1003]
  AddBot                       → Bot#1 picks V#1002
  Trigger Bot#1 timer          → V#1002 COMPLETE; Bot#1 picks N#1001
  AddBot                       → Bot#2 picks N#1003
  RemoveBot                    → Bot#2 removed; N#1003 rolls back to Normal head
  [Cleanup] tt.trigger()       → consume Bot#2's orphan channel
  Trigger Bot#1 timer          → N#1001 COMPLETE; Bot#1 picks N#1003
  Trigger Bot#1 timer          → N#1003 COMPLETE; Bot#1 IDLE

Final Assertions:
  - All 3 orders COMPLETE
  - Processing order: V#1002 → N#1001 → N#1003
  - Bot#2 removed
```

| # | Case | Assertion |
|---|------|------|
| 14 | End-to-end scenario | See table above |

> **Total**: 14 cases (including 1 end-to-end scenario).

---

## Workflow 4: Demo Script Entry Point

**Corresponding todos**: 4.1 demo/main.go → 4.2 scripts/run.sh → 4.3 build.sh → 4.4 verify result.txt

**Not Go tests**, do not write `_test.go` files. Verification method:

| # | Verification Item | Method |
|---|--------|------|
| 1 | demo exits normally (exit code 0) | `go run ./cmd/demo` returns 0 |
| 2 | result.txt exists and is non-empty | `test -s result.txt` |
| 3 | Timestamp format `[HH:MM:SS]` | grep regex |
| 4 | Contains initialization event | grep "System initialized" |
| 5 | Contains COMPLETE event | grep "COMPLETE" |

CI verifies via `scripts/run.sh` → `result.txt`.

---

## Workflow 5: Interactive CLI

**Corresponding todos**: 5.1 interactive/main.go → 5.2 scripts/test.sh

**Not Go tests**. `scripts/test.sh` runs `go test ./... -v`. Interactive CLI functionality is verified through manual demonstration during the interview.

---

## Running Tests

```bash
# All Go tests
go test ./... -v

# Unit tests only (skip controller integration tests)
go test ./internal/queue/... ./internal/bot/... -v

# CI
bash scripts/test.sh
```
