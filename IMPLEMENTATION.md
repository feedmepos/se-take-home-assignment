# Backend Implementation Notes

Go implementation of the McDonald's automated order controller. See `README.md` for the assignment requirements; this document explains how the solution is built and how to operate it.

---

## Quick Start

```bash
# Run unit tests (race detector on)
./scripts/test.sh

# Build the CLI binary (output: bin/order-controller)
./scripts/build.sh

# Run the scripted demo and write timestamped output to scripts/result.txt
./scripts/run.sh
```

For interactive use:

```bash
# Default 10-second tick (per spec)
go run . 

# Faster tick for live demoing
go run . --tick-seconds 2
```

Available flags:

| Flag | Default | Meaning |
|---|---|---|
| `--demo` | `false` | Run the scripted demo scenario and exit (used by `scripts/run.sh` for CI) |
| `--tick-seconds` | `10` | Seconds each bot spends processing one order |

---

## Project Structure

```
.
├── go.mod                          # Go module declaration (go 1.23 to match CI)
├── main.go                         # CLI entry: --demo runner + interactive REPL
├── controller/
│   ├── order.go                    # Order type, OrderType/Status enums, priority queue
│   ├── bot.go                      # Bot struct + sleepCtx helper (interruptible sleep)
│   ├── controller.go               # OrderController: orchestrates orders, bots, queue
│   └── controller_test.go          # 10 unit tests, race-clean
├── scripts/
│   ├── build.sh                    # go build -> bin/order-controller
│   ├── test.sh                     # go test ./... -v -race -timeout 60s
│   ├── run.sh                      # ./bin/order-controller --demo > scripts/result.txt
│   └── result.txt                  # CI-validated output (HH:MM:SS timestamped events)
├── .github/workflows/
│   └── backend-verify-result.yaml  # CI workflow (provided by assignment)
└── IMPLEMENTATION.md               # This file
```

All shell scripts use `set -euo pipefail` and the `SCRIPT_DIR` pattern, so they work from any CWD.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                              main.go                                   │
│  ┌──────────────────────────────┬─────────────────────────────────┐  │
│  │  Interactive REPL (default)   │      Demo runner (--demo)        │  │
│  │  reads stdin line-by-line     │      runs scripted scenario      │  │
│  └──────────────┬───────────────┴─────────────────┬───────────────┘  │
│                 │                                  │                   │
│                 └──────────────┬──────────────────┘                   │
│                                ↓                                       │
└────────────────────────────────┼───────────────────────────────────────┘
                                 │ calls
                                 ↓
┌──────────────────────────────────────────────────────────────────────┐
│                    controller.Controller                              │
│                                                                       │
│   ┌────────────┐    ┌────────────┐    ┌────────────────────────┐    │
│   │  Priority  │    │   Bots     │    │   Completed orders     │    │
│   │   queue    │    │  (slice)   │    │       (slice)          │    │
│   │  vip / norm│    │            │    │                        │    │
│   └─────┬──────┘    └─────┬──────┘    └────────────────────────┘    │
│         │                  │                                          │
│         └──────────┬───────┘                                          │
│                    ↓                                                   │
│         ┌────────────────────┐                                        │
│         │  sync.Mutex (mu)   │  serializes all shared-state access   │
│         │  sync.Cond (cond)  │  wakes bots when work / stop changes  │
│         └────────────────────┘                                        │
└──────────────────────────────────────────────────────────────────────┘
                                 ↑
                                 │ each bot runs in its own goroutine,
                                 │ pulled from queue, processes via sleepCtx,
                                 │ requeues on cancellation
                                 │
            ┌────────────────────┴────────────────────┐
            │ goroutine: runBot(b)   goroutine: ...    │
            └─────────────────────────────────────────┘
```

### Responsibilities

| Component | Owns |
|---|---|
| `main.go` | Flag parsing, logger wiring (timestamp prefix), REPL loop, demo scenario |
| `controller/order.go` | Order types, two-tier priority queue (`vip` slice + `normal` slice) |
| `controller/bot.go` | Bot state, interruptible sleep (`sleepCtx`) |
| `controller/controller.go` | The only place shared state is touched; lock discipline lives here |

---

## CLI Modes

### Interactive REPL (default)

| Input | Action |
|---|---|
| `n` \| `normal` \| `new normal` | Create a Normal order |
| `v` \| `vip` \| `new vip` | Create a VIP order |
| `+` \| `+bot` \| `add bot` | Add a bot (starts processing immediately if work exists) |
| `-` \| `-bot` \| `remove bot` | Destroy newest bot; if processing, requeue its order |
| `s` \| `status` | Print PENDING, COMPLETE, and BOTS lists |
| `h` \| `help` \| `?` | Show commands |
| `q` \| `quit` \| `exit` | Graceful shutdown and exit |

### Demo mode (`--demo`)

Runs a scripted 6-phase scenario:
1. Create Normal #1, VIP #2, Normal #3, VIP #4 → verify queue is `[VIP#2, VIP#4, Normal#1, Normal#3]`
2. Add Bot#1, Bot#2 → both start processing VIP orders
3. After ~tick/3 seconds: Remove Bot#2 mid-processing → VIP#4 returns to front of VIP queue
4. Add Bot#3 → picks up the requeued VIP#4
5. Wait until all orders complete (bots become IDLE)
6. Shutdown — destroy all bots

Total runtime ≈ `tick × 3` seconds (≈25s with the default 10s tick).

---

## Testing

`go test ./... -v -race -timeout 60s` runs 10 tests:

| Test | What it verifies |
|---|---|
| `TestOrderIDsAreUniqueAndIncreasing` | Order IDs are 1, 2, 3, … |
| `TestVIPGoesAheadOfNormalButBehindOtherVIP` | Queue ordering: `[VIP#2, VIP#4, Normal#1, Normal#3]` |
| `TestBotProcessesOrderAndBecomesIdle` | Single bot processes order, becomes IDLE |
| `TestBotPicksUpVIPFirst` | When both VIP and Normal pending, VIP is picked first |
| `TestRemovingBotMidProcessingRequeuesOrder` | -Bot during processing returns order to queue |
| `TestRequeuedVIPGoesToFrontOfVIPs` | Requeued VIP lands in front of other VIPs |
| `TestAddingBotImmediatelyProcessesPendingOrder` | +Bot with pending work starts processing immediately |
| `TestRemovingNonExistentBotIsNoOp` | -Bot with no bots returns nil cleanly |
| `TestCompletedOrdersAreTracked` | COMPLETE area populated as orders finish |
| `TestShutdownStopsAllBots` | Shutdown drains all bot goroutines |

Tests use a 50ms tick (vs 10s in production) for speed. The `-race` flag enables Go's race detector; all tests pass clean.