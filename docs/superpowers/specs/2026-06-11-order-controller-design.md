# Order Controller CLI — Design Document

## Overview
McDonald's automated cooking bot order controller. A Go CLI application that simulates order queue management with VIP prioritization, dynamic bot pool, and timestamped event logging.

## Architecture

```
CLI (cobra) → OrderController → PriorityQueue + BotPool → Recorder → stdout/result.txt
```

### Layers
| Layer | Responsibility |
|-------|---------------|
| `cmd/foundation-cli/main.go` | Entry: build deps, Execute, ExitCodeOf |
| `cmd/root.go` | Root cmd builder, register domain commands |
| `internal/business/order/commands.go` | cobra `CommandMeta` for `demo` subcommand |
| `internal/business/order/controller.go` | `OrderController`: queue + bot management |
| `internal/business/order/models.go` | `Order`, `Bot`, `OrderType`, `Event` types |
| `internal/business/order/priority_queue.go` | VIP-priority queue (container/heap) |
| `internal/business/order/recorder.go` | Event recorder with HH:MM:SS timestamps |
| `internal/business/order/demo.go` | Built-in demo scenario definition |
| `internal/platform/output/` | Streams + WriteRaw (reuse from convention) |

## Core Data Models

### Order
```go
type OrderType int
const (
    OrderNormal OrderType = iota
    OrderVIP
)

type Order struct {
    ID        uint64
    Type      OrderType
    CreatedAt time.Time
    Status    OrderStatus  // Pending, Processing, Completed
}
```

### Bot
```go
type Bot struct {
    ID        uint64
    Status    BotStatus    // Idle, Busy
    Order     *Order       // current order (nil if idle)
    CreatedAt time.Time
}
```

### Event
```go
type Event struct {
    Timestamp time.Time
    Message   string
}
```

## Priority Queue

- Implemented via `container/heap` interface
- Ordering: VIP first (higher priority), then FIFO within same type
- Supports: `Push`, `Pop`, `RemoveAt(index)` — for order return on bot removal

### Queue invariants
- VIP orders always before Normal orders
- Within same type: FIFO
- On bot removal: order returns to its original position

## Order Controller

### State
- `orders queue` — priority queue of pending orders
- `bots []*Bot` — bot pool (LIFO for removal)
- `nextOrderID uint64` — auto-incrementing
- `nextBotID uint64` — auto-incrementing
- `recorder *Recorder` — event log

### Operations

| Operation | Behavior |
|-----------|----------|
| `NewOrder(OrderType)` | Create order with next ID, push to queue, attempt dispatch to idle bot |
| `AddBot()` | Create bot, if orders pending → pick first, process for 10s |
| `RemoveBot()` | Remove newest bot. If busy → return order to queue original position |
| `tick()` | Internal: check if any busy bot completed 10s → move order to completed, pick next pending |

### Bot Processing (goroutine)
1. Bot receives order via channel
2. Sets status to Busy
3. Sleeps 10s (or simulated time)
4. Sends completion signal on done channel
5. Controller receives signal → move order to Completed, dispatch next pending to bot

## Demo Scenario

Built-in demo that exercises all 7 requirements:

Queue timeline (orders in PENDING shown as [queue]):

```
[10:00:00] Order #1 (Normal) → PENDING                [N1]
[10:00:01] Order #2 (Normal) → PENDING                [N1, N2]
[10:00:02] Order #3 (VIP) → PENDING                   [VIP3, N1, N2]
[10:00:03] Order #4 (VIP) → PENDING                   [VIP3, VIP4, N1, N2]
[10:00:03] +Bot #1 → picks Order #3 (VIP)             [VIP4, N1, N2]        Bot1: processing VIP3
[10:00:03] +Bot #2 → picks Order #4 (VIP)             [N1, N2]              Bot2: processing VIP4
[10:00:04] +Bot #3 → picks Order #1 (Normal)          [N2]                  Bot3: processing N1
[10:00:04] -Bot #3 → Order #1 returned to PENDING     [N1, N2]              Bot3 destroyed
[10:00:13] Order #3 (VIP) → COMPLETED by Bot #1       [N1, N2]              Bot1: picks N1
[10:00:13] Order #4 (VIP) → COMPLETED by Bot #2       [N2]                  Bot2: picks N2
[10:00:23] Order #1 (Normal) → COMPLETED by Bot #1    []                    Bot1: IDLE
[10:00:23] Order #2 (Normal) → COMPLETED by Bot #2    []                    Bot2: IDLE
[10:00:23] +Order #5 (Normal) → PENDING               [N5]                  Bot1: picks N5 (idle → active)
[10:00:33] Order #5 (Normal) → COMPLETED by Bot #1    []                    Bot1: IDLE
```

### Time Strategy
- Use compressed simulation time: 10 simulated seconds = 1 real second
- Demo completes in ~4 real seconds
- All output timestamps show HH:MM:SS in simulated time (10s intervals appear as 1s real intervals)

## Output Format (result.txt)

```
=== McDonald's Order Controller Demo ===
[10:00:00] Order #1 (Normal) → PENDING
[10:00:01] Order #2 (Normal) → PENDING
[10:00:02] Order #3 (VIP) → PENDING
[10:00:03] Order #4 (VIP) → PENDING
[10:00:03] +Bot #1 → picks Order #3 (VIP) (completes at 10:00:13)
[10:00:03] +Bot #2 → picks Order #4 (VIP) (completes at 10:00:13)
[10:00:04] +Bot #3 → picks Order #1 (Normal) (completes at 10:00:14)
[10:00:04] -Bot #3 → Order #1 returned to PENDING (maintains priority)
[10:00:13] Order #3 (VIP) → COMPLETED by Bot #1
[10:00:13] Bot #1 → picks Order #1 (Normal) (completes at 10:00:23)
[10:00:13] Order #4 (VIP) → COMPLETED by Bot #2
[10:00:13] Bot #2 → picks Order #2 (Normal) (completes at 10:00:23)
[10:00:23] Order #1 (Normal) → COMPLETED by Bot #1
[10:00:23] Bot #1 → IDLE (no pending orders)
[10:00:23] Order #2 (Normal) → COMPLETED by Bot #2
[10:00:23] Bot #2 → IDLE (no pending orders)
[10:00:23] +Order #5 (Normal) → PENDING → picked by Bot #1 (idle reactivated)
[10:00:33] Order #5 (Normal) → COMPLETED by Bot #1
=== Demo Complete ===
```

## Scripts

### scripts/test.sh
```bash
go test ./... -v
```

### scripts/build.sh
```bash
go build -o order-controller ./cmd/foundation-cli
```

### scripts/run.sh
```bash
./order-controller > scripts/result.txt
```

## Testing Strategy

### Unit Tests

| Test File | What it tests |
|-----------|---------------|
| `priority_queue_test.go` | Push/Pop order, VIP before Normal, FIFO within type, RemoveAt |
| `controller_test.go` | NewOrder, AddBot, RemoveBot, order returns on bot removal, idle bot dispatch |
| `recorder_test.go` | Timestamp formatting, message recording |

### Test patterns (per AGENTS.md)
- `package order_test` (external test package)
- `TestXxx_Yyy` naming
- `t.Fatalf` for assertions
- Table-driven where applicable

## File Inventory

```
cmd/foundation-cli/main.go
cmd/root.go
internal/business/order/commands.go
internal/business/order/controller.go
internal/business/order/models.go
internal/business/order/priority_queue.go
internal/business/order/recorder.go
internal/business/order/demo.go
internal/platform/output/streams.go
internal/platform/output/writer.go
tests/unit/business/order/priority_queue_test.go
tests/unit/business/order/controller_test.go
tests/unit/business/order/recorder_test.go
scripts/test.sh                 (update)
scripts/build.sh                (update)
scripts/run.sh                  (update)
```
