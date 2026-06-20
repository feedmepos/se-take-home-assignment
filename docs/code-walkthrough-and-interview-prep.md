# Code Walkthrough and Interview Prep

This guide explains the current implementation in a way that is useful for review, demo, and interview discussion.

## 1. High-Level Summary

This project implements a McDonald's order management simulation using Node.js and TypeScript.

The backend is a CLI application. The frontend is a static browser demo. Both reuse the same `OrderController`, so the business rules are implemented once and shared across CLI, tests, and UI.

```text
src/domain.ts
  shared types, statuses, branded IDs

src/time.ts
  HH:MM:SS parsing and formatting

src/orderController.ts
  core order and bot business logic

src/cli.ts
  non-interactive result output and interactive CLI dashboard

frontend/app.ts
  browser UI that reuses the controller
```

The most important thing to explain:

> The controller is the single source of truth. CLI and frontend are only adapters around it.

## 2. Main Business Rules

The implementation supports these rules:

- Normal and VIP orders can be created.
- VIP orders have priority while waiting in the pending queue.
- FIFO order is preserved within the same priority.
- Bots process one order at a time.
- Each order takes 10 simulated seconds by default.
- Adding an idle bot immediately assigns the next pending order.
- Adding an order while a bot is idle immediately assigns it.
- Destroying the newest bot removes that bot.
- If the destroyed bot was processing an order, that order goes back to pending.
- A VIP order does not interrupt a normal order that is already processing.
- All event output includes timestamps in `HH:MM:SS` format.

## 3. Folder Structure

```text
.
|-- .github/workflows/
|   `-- backend-verify-result.yaml
|-- docs/
|   |-- code-walkthrough-and-interview-prep.md
|   `-- project-structure.md
|-- frontend/
|   |-- app.ts
|   |-- index.html
|   `-- styles.css
|-- scripts/
|   |-- build-static-site.mjs
|   |-- build.sh
|   |-- result.txt
|   |-- run.sh
|   `-- test.sh
|-- src/
|   |-- cli.ts
|   |-- domain.ts
|   |-- orderController.ts
|   `-- time.ts
|-- test/
|   |-- cliResult.test.ts
|   `-- orderController.test.ts
|-- package.json
|-- tsconfig.json
`-- vercel.json
```

## 4. Core File Responsibilities

### `src/domain.ts`

This file defines the shared vocabulary of the system.

It contains:

- Branded IDs: `OrderId`, `BotId`, `Seconds`
- Status constants: `ORDER_TYPES`, `BOT_STATUS`, `ORDER_STATUS`
- Public snapshot types: `OrderSnapshot`, `BotSnapshot`, `ControllerSnapshot`
- Options type for controller setup: `OrderControllerOptions`

Why this matters:

- It keeps shared types out of the controller implementation.
- It makes frontend, CLI, and tests import the same contract.
- Branded IDs help prevent mixing plain numbers with domain IDs by accident.

Example explanation:

> I separated domain types from behavior. This makes the controller easier to read, and it gives the frontend and CLI a stable public contract.

### `src/time.ts`

This file handles simulated time.

It contains:

- `formatSecondsAsTime(totalSeconds)`
- `parseTimeToSeconds(time)`
- `toSeconds(value)`

Why this matters:

- Time formatting is required by the assignment.
- Keeping it separate means the controller does not need to own parsing or formatting details.
- The tests can validate time behavior directly.

Example explanation:

> The system uses simulated seconds internally, then formats output as HH:MM:SS at the boundary.

### `src/orderController.ts`

This is the main business logic file.

Private internal state:

```text
currentTime
nextOrderId
nextBotId
pendingOrders
completedOrders
bots
events
```

Public methods:

```text
addNormalOrder()
addVipOrder()
addBot()
removeBot()
advanceTime(seconds)
getSnapshot()
formatEvents()
```

Private helper methods:

```text
addOrder(type)
insertPendingOrder(order)
dispatchIdleBots()
nextCompletionAt(targetTime)
completeDueOrders()
log(message)
findBot(id)
```

The controller keeps the core state private. External callers only interact through public methods and snapshots.

## 5. Important Flow: Creating An Order

When a normal or VIP order is created:

```text
addNormalOrder() or addVipOrder()
  -> addOrder(type)
  -> insertPendingOrder(order)
  -> log event
  -> dispatchIdleBots()
  -> return OrderSnapshot
```

Important detail:

`insertPendingOrder` sorts pending orders using:

```text
VIP first
then Normal
then lower order ID first
```

This gives priority to VIP orders while preserving FIFO within each order type.

Interview explanation:

> I do not maintain two separate queues. I keep one pending queue and sort by priority, then by order ID. For this assignment size, that is simple and easy to reason about.

## 6. Important Flow: Adding A Bot

When a bot is added:

```text
addBot()
  -> create idle bot
  -> push into bots
  -> log event
  -> dispatchIdleBots()
  -> return BotSnapshot
```

`dispatchIdleBots` finds idle bots, then assigns pending orders to them.

Important behavior:

- Idle bots are sorted by bot ID.
- The oldest idle bot gets work first.
- If no pending order exists, the bot stays idle.

## 7. Important Flow: Advancing Time

The controller does not use real-time sleeping for backend tests.

Instead, `advanceTime(seconds)` moves simulated time forward.

```text
advanceTime(seconds)
  -> validate seconds
  -> calculate target time
  -> find next completion before target
  -> jump to that completion
  -> complete due orders
  -> repeat until no more completions before target
  -> set current time to target
```

Why this is good:

- Tests are deterministic and fast.
- No flaky timers.
- The CLI result is repeatable.
- It can handle multiple completions in one large time jump.

Interview explanation:

> I modelled time as deterministic simulation time instead of real time. That makes the backend testable and reliable in GitHub Actions.

## 8. Important Flow: Completing Orders

When time reaches a bot's completion time:

```text
completeDueOrders()
  -> find processing bots due at current time
  -> mark their orders complete
  -> move orders to completedOrders
  -> convert bots back to idle
  -> dispatch idle bots again
  -> log idle status if no new order was assigned
```

Important detail:

After a bot completes an order, it immediately tries to pick up the next pending order.

## 9. Important Flow: Removing A Bot

When a bot is removed:

```text
removeBot()
  -> if no bots, log and return null
  -> find newest bot by highest bot ID
  -> remove it from bot list
  -> if it was processing, return the order to pending
  -> dispatch remaining idle bots
```

Important behavior:

- The assignment asks for destroying the newest bot.
- If a processing bot is destroyed, its order is not lost.
- The order goes back to pending and is reprioritized.

Interview explanation:

> I treat destroying a bot as cancelling the worker, not cancelling the order. The order returns to pending so another bot can process it later.

## 10. Snapshots

The controller exposes state using snapshots:

```text
getSnapshot()
```

This returns:

- current simulated time
- pending orders
- processing orders
- completed orders
- bots

Why this matters:

- CLI and frontend do not directly mutate controller internals.
- UI rendering receives read-only shaped data.
- Tests can assert on behavior without reaching into private fields.

Interview explanation:

> The controller owns mutation. Consumers ask for snapshots, which keeps state access controlled and predictable.

## 11. CLI Implementation

File: `src/cli.ts`

There are two CLI modes.

### Non-interactive mode

Default command:

```bash
node dist/src/cli.js
```

This runs `runDemo()` and prints a deterministic simulation report.

This is what `scripts/run.sh` uses to generate:

```text
scripts/result.txt
```

Every line is timestamped.

### Interactive mode

Command:

```bash
npm run cli
```

Internally this runs:

```bash
node dist/src/cli.js --interactive
```

Supported commands:

```text
n       create normal order
v       create VIP order
+       add bot
-       remove newest bot
t 10    advance simulated time by 10 seconds
s       refresh status
h       help reminder
q       quit
```

Interview explanation:

> The assignment needs GitHub Actions compatibility, so the default CLI is non-interactive and writes result output. I also added an interactive mode for interview demonstration.

## 12. Frontend Implementation

File: `frontend/app.ts`

The frontend is a static TypeScript app with no framework.

It:

- Creates an `OrderController`
- Wires button clicks to controller methods
- Calls `render()` after each action
- Displays pending orders, bots, completed orders, counters, clock, and event log
- Uses badges to make VIP and NORMAL order types visible across states

Important detail:

The frontend imports the same controller:

```text
import { OrderController } from "../src/orderController.js";
```

This means frontend behavior matches backend behavior.

Interview explanation:

> The frontend is intentionally thin. It demonstrates the system visually, but the rules still live in the shared controller.

## 13. Build And Deployment

### TypeScript build

```bash
npm run build
```

This compiles:

- `src/*.ts`
- `frontend/app.ts`
- `test/*.ts`

Output goes into:

```text
dist/
```

### Static site build

```bash
npm run build:site
```

This compiles TypeScript and runs:

```text
scripts/build-static-site.mjs
```

That script copies frontend files into:

```text
dist/public/
```

`vercel.json` points Vercel at `dist/public`.

## 14. Assignment Scripts

The required scripts are in `scripts/`.

### `scripts/test.sh`

Runs:

```bash
npm ci
npm test
```

### `scripts/build.sh`

Runs:

```bash
npm ci
npm run build
```

### `scripts/run.sh`

Runs:

```bash
npm ci
npm run build
node dist/src/cli.js > scripts/result.txt
```

This satisfies the backend requirement that CLI output is written to `result.txt`.

## 15. GitHub Actions

Workflow:

```text
.github/workflows/backend-verify-result.yaml
```

It runs on pull requests into `main`.

It:

- Checks out the repo
- Installs Go and Node.js
- Makes scripts executable
- Runs `scripts/test.sh`
- Runs `scripts/build.sh`
- Runs `scripts/run.sh`
- Verifies `scripts/result.txt` exists, is not empty, and contains timestamps

Interview explanation:

> The scripts are the contract for GitHub Actions. I kept them simple and POSIX-compatible so the workflow can run them directly.

## 16. Tests

Tests use Node's built-in test runner.

```bash
npm test
```

Covered happy paths:

- VIP orders are prioritized.
- FIFO is preserved inside VIP and normal groups.
- Bots pick up work immediately.
- Orders complete after the full processing time.
- Bots continue processing the next pending order.

Covered sad or edge paths:

- Removing a processing bot returns the order to pending.
- Destroyed bot's order does not accidentally complete later.
- VIP order does not interrupt an already-processing normal order.
- Removing a bot when none exist does not crash.
- Invalid time advancement is rejected.
- CLI output lines must include timestamps.
- Invalid HH:MM:SS parsing is rejected.

## 17. Engineering Practices Implemented

### Single source of truth

Business logic lives in `OrderController`.

CLI and frontend do not duplicate the queue rules.

### Clear boundaries

The code is split by responsibility:

- `domain.ts` for shared vocabulary
- `time.ts` for time utilities
- `orderController.ts` for business logic
- `cli.ts` for terminal presentation
- `frontend/app.ts` for browser presentation

### Type safety

The project uses strict TypeScript settings:

- `strict`
- `noUncheckedIndexedAccess`
- `exactOptionalPropertyTypes`
- `noUnusedLocals`
- `noUnusedParameters`
- `isolatedModules`

### Branded domain types

`OrderId`, `BotId`, and `Seconds` are branded number types.

This makes it harder to accidentally pass a bot ID where an order ID is expected.

### Discriminated unions

Bots are modelled as:

```text
IdleBot | ProcessingBot
```

The `status` field tells TypeScript which shape the bot has.

### Encapsulation

Controller state is private. Consumers use public methods and snapshots.

### Deterministic simulation

The system uses simulated time instead of real delays for backend logic.

This improves:

- test speed
- repeatability
- GitHub Actions reliability

### Meaningful tests

Tests assert behavior instead of implementation details.

They focus on queue priority, bot lifecycle, time behavior, and result output.

### Minimal dependencies

The backend uses Node.js and TypeScript only.

This keeps the assignment easy to run in GitHub Actions and easy to explain.

### Compiler quality gates

Unused code now fails the build.

This prevents dead helpers like an unused rendering function from staying hidden.

## 18. Performance Notes

Current implementation is intentionally simple.

Pending order insertion sorts the queue after each insert:

```text
O(n log n)
```

For a take-home simulation, this is clear and acceptable.

If this needed to scale heavily, possible improvements:

- use separate VIP and normal queues
- dispatch from VIP queue first, then normal queue
- avoid sorting on every insert
- use a min-heap for completion times if there are many bots

Interview explanation:

> I optimized for correctness and readability for the assignment. If scale became a requirement, I would replace the sorted pending array with separate priority queues.

## 19. How To Demo Locally

Install dependencies:

```bash
npm ci
```

Run tests:

```bash
npm test
```

Build:

```bash
npm run build
```

Generate result file:

```bash
bash scripts/run.sh
```

Open interactive CLI:

```bash
npm run cli
```

Build static frontend:

```bash
npm run build:site
```

## 20. Interview Explanation Script

Use this as your spoken structure.

### 1. Start with the architecture

> I implemented the backend in Node.js with TypeScript. The core logic is in `OrderController`, and both CLI and frontend reuse it. That keeps the behavior consistent and avoids duplicated business rules.

### 2. Explain the domain model

> Orders have an ID, type, status, created time, started time, and completed time. Bots can be idle or processing. I modelled bot state as a discriminated union so TypeScript knows which fields are available.

### 3. Explain VIP priority

> Pending orders are sorted by priority first and order ID second. VIP orders go before normal orders, but FIFO is preserved within the same type.

### 4. Explain time

> I use simulated time rather than real timers for backend logic. That makes tests deterministic and allows GitHub Actions to run everything quickly.

### 5. Explain bot removal

> Removing a bot destroys the newest bot. If it was processing, the order goes back to pending rather than being lost.

### 6. Explain CLI and result.txt

> The default CLI is non-interactive so GitHub Actions can run it and write `scripts/result.txt`. Every output line includes a timestamp in HH:MM:SS format.

### 7. Explain interactive CLI and frontend

> I also added an interactive CLI and a static frontend demo to make the behavior easy to demonstrate during the interview.

### 8. Explain quality

> I added unit tests for priority, bot lifecycle, time advancement, edge cases, and timestamp output. TypeScript strict mode and unused-code checks are enabled as quality gates.

## 21. Likely Questions And Answers

### Why TypeScript?

TypeScript gives compile-time safety, clearer domain contracts, and better maintainability while still running in Node.js for GitHub Actions.

### Why not use a framework?

The assignment is mainly about backend logic and CLI behavior. A framework would add complexity without solving a real problem here.

### Why simulated time?

It avoids slow or flaky tests. The system can jump forward in time and complete orders deterministically.

### Does VIP interrupt normal orders?

No. VIP priority only applies to pending orders. Once a normal order is processing, it continues until completion unless its bot is destroyed.

### What happens when a bot is destroyed?

The newest bot is removed. If it was processing an order, the order is returned to pending and can be picked up by another bot.

### How does the frontend stay consistent with backend behavior?

It imports and uses the same `OrderController`. The UI is only a presentation layer.

### What would you improve with more time?

Possible improvements:

- Separate VIP and normal queues for better large-scale performance.
- More CLI commands, such as listing full history or changing processing duration interactively.
- End-to-end browser tests for the frontend.
- Stronger CI checks for frontend deployment output.

