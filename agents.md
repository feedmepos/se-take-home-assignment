# McDonald's Cooking Bot Simulation - System Design & Rules

This document outlines the rules, architectural decisions, and design choices made during the implementation of the McDonald's Cooking Bot Simulation.

---

## 1. Core Concurrency Architecture

We implemented a **Dispatcher-Worker pattern** built entirely on Go's standard primitives: goroutines, channels, and contexts. This aligns with the principles of cooperative cancellation outlined in [Go Concurrency Patterns: Pipelines and cancellation](https://go.dev/blog/pipelines).

```
  Ingestion Engine (CLI/Simulation)
                │
                ▼ (Thread-safe lockless channels)
      Central Event Dispatcher
        ├── Priority-Sorted Queue (PENDING)
        └── Active Bot Pool (Workers)
```

### Worker Lifecycle & cooperative cancellation
- Each bot runs in its own goroutine with an isolated context (`context.Context` and a `CancelFunc`).
- Bots register themselves as idle by sending themselves to the dispatcher's `botIdleChan`.
- Cooking is a non-blocking select between a `time.Timer` (representing the 10s cook time) and the bot's `Ctx.Done()` channel:
  ```go
  select {
  case <-timer.C:
      // Completion path
  case <-b.Ctx.Done():
      // Cancellation/Interruption path
  }
  ```
- Decreasing bot count (`- Bot`) triggers the cancellation of the newest bot's context. If that bot is active, its cooking loop immediately catches the cancellation, reverts the order status back to `PENDING`, pushes it back to the queue via the dispatcher, and exits cleanly.

### Single-Threaded Actor Loop
To avoid race conditions and complex lock contention, the **Dispatcher** runs a single-threaded loop processing events from channels:
- Adding orders
- Registering/Unregistering bots
- Handling bot idle status
- Handling order completion or interruption events
All state changes occur sequentially within this loop, making the dispatcher core race-free. A read-write mutex is only used when exposing state snapshots to the CLI/Simulation getters.

---

## 2. Priority Queue & Interruption Rules

### The Single Priority-Sorted Queue vs. Retry Queue (Bug Fix)
In early design phases, a separate "Retry Queue" (for interrupted orders) was proposed. We identified that **a separate Retry Queue introduces a priority inversion bug**:
- *If a Normal order is interrupted and put into a high-priority Retry Queue, it would be processed before a pending VIP order, violating the VIP precedence rule.*

**Solution**: We maintain a **single pending queue** sorted by two keys:
1. **Priority Class**: `VIP` (first) vs. `Normal` (second).
2. **Order ID**: Chronological unique order number (increasing).

When an order is interrupted, it retains its original `ID`. When re-sorted, it naturally returns to the front of its priority tier (since its ID is smaller/older than any orders added after it) without jumping ahead of higher-priority VIP orders.

### The Two-Queue Prepend Trade-off
We evaluated splitting pending orders into a `vipQueue` and a `normalQueue` using `$O(1)$` prepending for interrupted orders. 
* **The Race Condition**: If multiple bots are cancelled concurrently, the order of cancellation returns is non-deterministic. Prepending them directly can cause a newer interrupted order to be placed before an older interrupted order, violating the FIFO requirement.
* **Resolution**: To prevent this, our single priority-sorted queue remains the most robust choice. If two queues were to be used, interrupted orders would need to be inserted in-order by ID rather than prepended, which increases complexity.

---

## 3. Strict Testing & Verification Rules

Every User Story is tested by automated unit tests in [controller_test.go](file:///Users/zhijian/Documents/antigravity/goofy-carson/pkg/controller/controller_test.go):

1. **User Story 1: Normal Order Flow (`TestNormalOrderFlow`)**: Verifies orders transition from `PENDING` $\rightarrow$ `PROCESSING` $\rightarrow$ `COMPLETE`.
2. **User Story 2: VIP Priority & FIFO (`TestVIPPriorityAndFIFO`)**: Asserts VIP precedence and FIFO behavior within both VIP and Normal categories.
3. **User Story 3: Bot Dynamic Scaling (`TestBotScaling`)**: Verifies bot creation picks up work, and bot destruction interrupts and safely re-enqueues active orders.
4. **User Story 4: Single Task Constraint & Timing (`TestBotSingleTaskAndTiming`)**: Asserts bots work on at most one task at a time and respect the cook duration.
5. **Format Check (`TestTimestampFormatting`)**: Asserts system logs strictly output timestamps in `[HH:MM:SS]` format.

### Accelerated Testing
All unit tests are run using small cook durations (e.g. `10ms` to `50ms`) rather than the real-time `10s` duration. This keeps tests execution fast (<1s) and reliable, while the production simulator runs in real-time.

---

## 4. Execution Commands

The application compiles into a single CLI binary supporting both non-interactive simulation and interactive CLI modes:

* **Build**:
  ```bash
  ./scripts/build.sh
  ```
* **Run Unit Tests**:
  ```bash
  ./scripts/test.sh
  ```
* **Run Simulation** (outputs timeline to `scripts/result.txt`):
  ```bash
  ./scripts/run.sh
  ```
* **Run Interactive CLI** (for candidate demonstration):
  ```bash
  ./order-controller -interactive
  ```
