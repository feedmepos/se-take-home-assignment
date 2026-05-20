# Backend Solution (Go CLI)

This document explains the final backend implementation, how to run it, and the engineering trade-offs made for this assignment.

## 1. Implementation Approach (Step-by-Step)

### Step 1: Scope and Constraints

- Use Go to build a CLI backend.
- Keep all state in memory (no persistence required).
- Make execution deterministic for GitHub Actions.

### Step 2: Domain Modeling

- `Order`
  - `ID`: user-facing order number (increasing, starts from `1001`).
  - `Sequence`: internal insertion order for stable re-queue behavior.
  - `Type`: `VIP` or `NORMAL`.
  - `Status`: `PENDING`, `PROCESSING`, `COMPLETE`.
- `Bot`
  - `ID`: increasing bot id.
  - `State`: `IDLE` or `BUSY`.
  - `CurrentOrder`: currently processing order (if any).
  - internal cancel function.

### Step 3: Business Controller

`Controller` is the in-memory source of truth:

- Queues:
  - `pendingVIP`
  - `pendingNormal`
  - `completed`
  - `bots`
- Synchronization:
  - protect all mutable state with `sync.Mutex`.
- Main public operations:
  - create normal order
  - create VIP order
  - add bot
  - remove latest bot
  - return snapshot
  - return final metrics summary

### Step 4: Scheduling and Processing

- Dispatch rule:
  - always pick VIP queue first, then normal queue.
  - keep FIFO inside each queue.
- Processing rule:
  - one bot handles one order at a time.
  - processing takes 10 seconds in runtime.
  - on completion, order moves to `COMPLETE`.

### Step 5: Cancel and Re-queue Rule

When removing the latest bot:

- if idle: remove immediately.
- if busy:
  - cancel current processing.
  - move current order back to pending.
  - restore queue order by `Sequence`, while preserving VIP priority.

### Step 6: CLI and Reporting

- Interactive mode prints banner and prompt.
- Non-interactive mode (scripted CI run) suppresses prompt noise.
- Supports `summary` command for final report output.

### Step 7: Script Automation

- `scripts/test.sh`: run tests with race detector.
- `scripts/build.sh`: build binary.
- `scripts/run.sh`: run deterministic scenario and write `scripts/result.txt`.
- `run.sh` writes the report title line, then appends CLI output.

### Step 8: Tests

Tests cover:

- VIP/Normal priority and FIFO behavior.
- order id increase behavior.
- processing completion flow.
- bot removal edge cases (busy/idle/empty/LIFO).
- concurrent stress scenario.
- race-safe behavior (`-race`).

## 2. How To Run

From repository root:

```bash
./scripts/test.sh
./scripts/build.sh
./scripts/run.sh
```

Check generated output:

```bash
cat scripts/result.txt
```

## 3. Design Decisions and Trade-offs

- **In-memory only**: assignment does not require persistence.
- **String enums**: clearer logs and better interview readability.
- **Mutex-based state management**: simple and robust for this scale.
- **Deterministic scripted run**: stable CI output and easier debugging.
- **Non-interactive output cleanup**: removes prompt noise from `result.txt`.
- **Timer-based processing (`time.NewTimer`)**: better control on cancellation path than `time.After`.
- **Minimal dependencies**: standard library only.

## 4. CLI Commands

Supported commands:

- `new normal`
- `new vip`
- `add bot`
- `remove bot`
- `status`
- `summary`
- `sleep N`
- `help`
- `exit`

Example command flow (used by `scripts/run.sh`):

```text
new normal
new vip
new normal
add bot
sleep 1
add bot
sleep 11
new vip
sleep 11
remove bot
sleep 1
summary
exit
```

Example output lines:

```text
McDonald's Order Management System - Simulation Results

[20:22:59] System initialized with 0 bots
[20:22:59] Created Normal Order #1001 - Status: PENDING
[20:22:59] Created VIP Order #1002 - Status: PENDING
[20:22:59] Created Normal Order #1003 - Status: PENDING
[20:22:59] Bot #1 created - Status: ACTIVE
[20:22:59] Bot #1 picked up VIP Order #1002 - Status: PROCESSING
[20:23:00] Bot #2 created - Status: ACTIVE
[20:23:00] Bot #2 picked up Normal Order #1001 - Status: PROCESSING
[20:23:09] Bot #1 completed VIP Order #1002 - Status: COMPLETE (Processing time: 10s)
[20:23:10] Bot #2 completed Normal Order #1001 - Status: COMPLETE (Processing time: 10s)
...
Final Status:
- Total Orders Processed: 4 (2 VIP, 2 Normal)
- Orders Completed: 4
- Active Bots: 1
- Pending Orders: 0
```

## 5. Project Structure (Backend Part)

```text
cmd/order-controller/main.go
internal/app/cli.go
internal/domain/order.go
internal/domain/bot.go
internal/domain/controller.go
internal/domain/controller_test.go
scripts/test.sh
scripts/build.sh
scripts/run.sh
scripts/result.txt
docs/backend-solution.md
```
