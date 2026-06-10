# FeedMe Order Management System — Task Breakdown

## Workflow 1: Domain Model + Priority Queue

**Goal**: Define Order / Bot types, implement VIP-first, same-priority FIFO order queue.

- [ ] 1.1 Create `internal/model/types.go`: Order, Bot types and status constants
- [ ] 1.2 Create `internal/queue/queue.go`: PriorityQueue (vipQ + normalQ dual queues)
- [ ] 1.3 Write `internal/queue/queue_test.go`: VIP priority, FIFO, RollbackToFront insert at head

## Workflow 2: Bot Lifecycle

**Goal**: Implement Bot's IDLE ↔ PROCESSING state machine, 10-second interruptible processing.

- [ ] 2.1 Create `internal/bot/bot.go`: Bot struct, IDLE/PROCESSING states, `process(order, doneCh <-chan time.Time)` with interruptible processing via independent doneCh
- [ ] 2.2 Write `internal/bot/bot_test.go`: Normal completion path, stopCh interruption path, state transitions

> **Timer injection**: `Bot.process()` accepts an independent `doneCh <-chan time.Time`. Production passes `time.After(10s)`; tests allocate an independent controllable channel per Bot to avoid signal contention from cross-Bot sharing.

## Workflow 3: Controller Orchestration Layer

**Goal**: Implement Controller that orchestrates queue and bots with a single lock protecting all shared state.

- [ ] 3.1 Create `internal/controller/controller.go`: AddNormalOrder, AddVIPOrder, AddBot, RemoveBot, assignPendingToIdleBots
- [ ] 3.2 Write `internal/controller/controller_test.go`: Table-driven integration scenario tests (add order → add Bot → wait for completion → remove Bot rollback)

> **Timer factory**: Controller accepts `newTimer func() <-chan time.Time` at construction. Production passes `time.After`; tests pass `testTimer` (creates independent channels per call, FIFO trigger). After `RemoveBot`, must explicitly trigger once to consume the orphan channel, ensuring subsequent signals reach the correct Bot.

## Workflow 4: Demo Script Entry Point

**Goal**: Implement CI entry point that runs a fixed scenario and outputs `result.txt`.

- [ ] 4.1 Create `cmd/demo/main.go`: Orchestrate events per plan 7.1 scenario, use `time.Sleep` for intervals
- [ ] 4.2 Update `scripts/run.sh`: Compile + execute demo, output result.txt
- [ ] 4.3 Update `scripts/build.sh`: Compile cmd/demo and cmd/interactive
- [ ] 4.4 Run demo and verify `result.txt` output

## Workflow 5: Interactive CLI

**Goal**: Implement interactive command line for live interview demonstration.

- [ ] 5.1 Create `cmd/interactive/main.go`: Read stdin commands, output real-time status
- [ ] 5.2 Update `scripts/test.sh`: Run all unit tests

---

> **Constraints** (from AGENTS.md): Go 1.22+ stdlib only, single Mutex lock strategy, no panic, no global state, commit after each workflow completion (test + impl in same commit for TDD).
