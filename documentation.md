# FeedMe Go Backend Documentation

## Overview

This project implements the backend assignment as a Go CLI simulation for McDonald's order flow with bot workers.

Core goals implemented:

- In-memory order queue management (no persistence)
- VIP priority over normal orders
- Dynamic bot add/remove behavior
- 1 bot processes 1 order at a time
- Two bot types with configurable processing durations
- Timestamped output compatible with GitHub Actions verification

---

## Project Structure

- `cmd/order-controller/main.go`
  - CLI entrypoint
  - Interactive command loop
  - Status rendering (Bots table + Active Tasks table + Completed Tasks table)
- `internal/sim/sim.go`
  - Core simulation engine
  - Order lifecycle and queue policy
  - Bot lifecycle and cancellation behavior
  - Snapshot API for status and test assertions
- `internal/sim/sim_test.go`
  - Table-driven simulation tests
  - Scenario steps + expected result assertions
- `scripts/test.sh`
  - Runs unit tests (`go test ./... -v`)
- `scripts/build.sh`
  - Builds CLI binary (`go build -o order-controller ./cmd/order-controller`)
- `scripts/run.sh`
  - Runs demo flow and writes output to `scripts/result.txt`

---

## Implementation Details

## Data Model

- `OrderType`
  - `VIP`
  - `NORMAL`
- `OrderStatus`
  - `PENDING`
  - `PROCESSING`
  - `COMPLETE`
- `Order`
  - `ID`, `Type`, `Status`
- `Bot`
  - `ID`, `Type`, `ProcessDelay`, `cancelCh`, `doneCh`, `current`

The `Engine` manages:

- VIP queue (`vipQueue`)
- Normal queue (`normalQueue`)
- Completed list (`completed`)
- Active bots (`bots`)
- ID generators for order and bot IDs

## Queue and Priority Rules

- New VIP orders are appended to the VIP queue.
- New normal orders are appended to the normal queue.
- Dequeue order rule:
  1. Pick from VIP queue first
  2. Then from normal queue

This guarantees:

- VIP orders always run before normal orders
- VIP-to-VIP ordering remains FIFO
- normal-to-normal ordering remains FIFO

## Bot Processing Lifecycle

When adding a bot:

1. Bot is created and tracked by engine
2. Worker goroutine starts (`runBot`)
3. Bot loops:
   - poll queue
   - pick one order
   - set order to `PROCESSING`
   - sleep for processing duration based on bot type
   - set order to `COMPLETE`

Bot types:

- `NORMAL` bot: 10 seconds in CLI runtime
- `FAST` bot: 7 seconds in CLI runtime

When removing the newest bot:

1. Bot cancel channel is closed
2. If bot is processing:
   - current order is set back to `PENDING`
   - order is reinserted to queue front of its priority class
3. Worker exits and bot is removed from active list

## Snapshot/Status

`Engine.Snapshot()` returns:

- `Bots`: bot id, state, current order
- `ActiveTasks`: pending + processing
- `CompletedTasks`: completed only
- aggregate counts

CLI `status` prints three tables:

1. Bots
2. Active Tasks
3. Completed Tasks

---

## CLI Commands

In interactive mode (`go run cmd/order-controller/main.go`):

- `n` -> create normal order
- `v` -> create VIP order
- `+` -> add a new normal bot
- `f` -> add a new fast bot
- `-` -> remove newest bot
- `s` -> print current snapshot tables
- `demo` -> run a predefined scenario
- `help` -> print command list
- `exit` / `quit` -> leave program

---

## Testing

Test file: `internal/sim/sim_test.go`

Tests are table-driven with:

- `name`
- `steps` (scenario actions)
- `expectedResult`:
- `botCount`
- `completedTask`
- `totalUsedTime`
- `normalCount`
- `vipCount`
- plus active/pending/processing assertions

### Stop-and-Validate Pattern

To keep assertions deterministic, all scenarios use one stop mechanism before validation:

- `stopAndFreeze(engine)`
  - removes all active bots
  - returns final snapshot for assertions

This matches the expected workflow:

1. run scenario steps
2. stop all processing immediately
3. validate frozen state

### Covered Scenarios

1. **vip priority with two bots**
   - verifies completion ordering/counts and mixed type totals
2. **remove bot while processing**
   - verifies in-flight order returns to pending
3. **middle status**
   - verifies middle runtime condition is reached, then freeze and validate exact counts

---

## Build and Run

Run everything locally:

```bash
./scripts/test.sh
./scripts/build.sh
./scripts/run.sh
```

Result output is written to:

- `scripts/result.txt`

---

## GitHub Actions

Workflow: `.github/workflows/backend-verify-result.yaml`

Pipeline checks:

1. setup Go
2. run `scripts/test.sh`
3. run `scripts/build.sh`
4. run `scripts/run.sh`
5. validate `scripts/result.txt` exists, non-empty, and contains `HH:MM:SS` timestamps
