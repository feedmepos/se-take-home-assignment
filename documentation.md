# McDonald's Order Management System - Technical Documentation

## 1. Introduction

This project is a Node.js backend CLI prototype for the FeedMe Software Engineer take-home assignment.
It simulates McDonald's automated order control flow for Normal and VIP customer orders, along with cooking bots that process one order at a time.

The implementation focuses on:
- In-memory order and bot management
- VIP-first queueing with FIFO preserved within the same priority group
- Dynamic bot creation and removal
- Timestamped CLI output for GitHub Actions verification
- An interactive CLI mode for interview demonstration
- Unit-tested behavior for queueing, processing, status reporting, and bot edge cases

## 2. Tech Stack

- Runtime: Node.js
- Test framework: Jest
- Interface style: CLI / terminal-based interaction
- Persistence: None (all state is stored in memory)

## 3. Project Goals

The system is designed to satisfy the backend option in the assignment README:
- Provide a CLI application runnable in GitHub Actions
- Write meaningful simulation output to `scripts/result.txt`
- Include timestamps in `HH:MM:SS` format
- Support an interview-ready interactive mode
- Follow GitHub Flow for submission

## 4. High-Level Architecture

The project is organized by responsibility.

### Core modules

- `src/models`
  - Defines the domain objects: `Order` and `Bot`
- `src/constants`
  - Centralized status and type constants
- `src/controllers`
  - Contains the main orchestration and state management logic
- `src/utils`
  - Shared helpers such as log formatting
- `src/cli`
  - Executable CLI entry points for simulation and interactive use
- `tests`
  - Unit test coverage for the order control flow
- `scripts`
  - Shell scripts used by the assessment and GitHub Actions

## 5. Architecture Logic

### 5.1 Order lifecycle

An order goes through these states:
- `PENDING`
- `PROCESSING`
- `COMPLETE`

The state transitions are:
- New order creation -> `PENDING`
- Assigned to a bot -> `PROCESSING`
- Finished after processing time -> `COMPLETE`
- If interrupted by bot removal while processing -> back to `PENDING`

### 5.2 Queue behavior

Queue behavior is encapsulated in `src/controllers/queue-controller.js`.

Rules:
- VIP orders are always placed before Normal orders
- VIP orders maintain FIFO ordering among VIP orders
- Normal orders maintain FIFO ordering among Normal orders
- If an in-progress order is returned after bot removal, it is reinserted according to the same rules

This means the queue is not a simple append-only array. Insert position is calculated based on:
- Order type (`VIP` vs `Normal`)
- Order ID ordering within the same type

### 5.3 Bot behavior

Bot behavior is managed by `src/controllers/bot-controller.js` and the `Bot` model.

Rules:
- Each bot can process only one order at a time
- A bot is `IDLE` when `currentOrder === null`
- A bot is `ACTIVE` when it holds a `currentOrder`
- New bots receive increasing IDs starting from `1`
- Removing a bot removes the newest bot first

### 5.4 Main orchestration

`src/controllers/order-controller.js` is the main orchestrator.

Responsibilities:
- Create orders with unique increasing IDs starting from `1001`
- Insert orders into the queue
- Create and remove bots
- Assign pending orders to idle bots
- Start async processing timers
- Move completed orders into the completed list
- Return interrupted orders back to pending if a bot is removed mid-process
- Expose summarized state through `getStatus()`
- Emit log messages through an injected `onLog` callback

### 5.5 Logging strategy

All log message formatting is centralized in `src/utils/log-formatter.js`.

Benefits:
- Keeps log wording consistent
- Reduces duplicated string construction in controllers
- Makes the controller logic easier to read
- Ensures status labels are derived from the actual state rather than scattered hardcoded messages

### 5.6 Simulation flow

`src/cli/simulation.js` runs a scripted demo scenario.

What it does:
- Creates an `OrderController`
- Logs actions with timestamps
- Adds Normal and VIP orders
- Adds bots
- Waits for processing to occur
- Adds a later VIP order
- Removes a bot
- Writes the full output to `scripts/result.txt`

Note:
- The short `500ms` waits in the simulation are cosmetic only
- They make the timestamps look more realistic in the output
- The meaningful processing delay is still the configured `10000ms`

### 5.7 Interactive mode

`src/cli/interactive.js` provides a menu-driven terminal interface.

Supported actions:
- Create a Normal order
- Create a VIP order
- Add a bot
- Remove a bot
- Show current status
- Quit

Interactive mode also includes:
- Timestamped logs
- A live summary bar showing total bots, pending orders, and completed orders
- ANSI terminal colors for readability

## 6. File Structure

```text
se-take-home-assignment/
├── .github/
│   └── workflows/
│       └── backend-verify-result.yaml
├── scripts/
│   ├── build.sh
│   ├── result.txt
│   ├── run.sh
│   └── test.sh
├── src/
│   ├── cli/
│   │   ├── interactive.js
│   │   └── simulation.js
│   ├── constants/
│   │   └── statuses.js
│   ├── controllers/
│   │   ├── bot-controller.js
│   │   ├── order-controller.js
│   │   └── queue-controller.js
│   ├── models/
│   │   ├── bot.js
│   │   └── order.js
│   └── utils/
│       └── log-formatter.js
├── tests/
│   └── order-controller.test.js
├── .gitignore
├── package.json
├── README.md
└── documentation.md
```

## 7. Key Files and Responsibilities

### `package.json`
Defines project metadata and the main npm scripts:
- `npm test`
- `npm start`
- `npm run interactive`

### `src/constants/statuses.js`
Defines:
- `ORDER_STATUS`
- `BOT_STATUS`
- `ORDER_TYPE`

### `src/models/order.js`
Represents a single order with:
- `id`
- `type`
- `status`

### `src/models/bot.js`
Represents a cooking bot with:
- `id`
- `currentOrder`
- `timer`
- derived getters for `isIdle` and `status`

### `src/controllers/queue-controller.js`
Maintains the pending order list and handles priority insertion.

### `src/controllers/bot-controller.js`
Maintains the bot collection and exposes helper operations such as:
- `addBot()`
- `removeLatestBot()`
- `findIdleBot()`

### `src/controllers/order-controller.js`
Coordinates the entire application state and processing flow.

### `src/utils/log-formatter.js`
Formats all structured log messages.

### `src/cli/simulation.js`
Runs the scripted demo flow and writes `scripts/result.txt`.

### `src/cli/interactive.js`
Runs the interactive CLI used for manual demonstration.

### `tests/order-controller.test.js`
Contains unit tests for the controller behavior.

## 8. Data Flow

### Creating an order
1. User or simulation calls `addOrder(type)`
2. `OrderController` creates a new `Order`
3. `QueueController.insert(order)` places it in the correct pending position
4. A creation log is emitted
5. If an idle bot exists, `_assignOrderToIdleBot()` starts processing immediately

### Adding a bot
1. User or simulation calls `addBot()`
2. `BotController` creates and stores a new bot
3. A creation log is emitted
4. `OrderController._processNext(bot)` attempts to assign a pending order immediately

### Completing an order
1. `_processNext(bot)` dequeues a pending order
2. The order status changes to `PROCESSING`
3. A timer starts for `processingTime`
4. When the timer completes:
   - order becomes `COMPLETE`
   - bot becomes idle
   - order is pushed to `completedOrders`
   - a completion log is emitted
   - the bot immediately attempts the next pending order

### Removing a bot while processing
1. `removeBot()` removes the newest bot
2. If the bot has an active timer, it is cleared
3. If the bot holds an active order:
   - the order is reset to `PENDING`
   - the order is reinserted into the pending queue
   - a removal log is emitted
   - another idle bot may pick it up immediately if available

## 9. Requirements Checklist

### Assignment requirements

- `[x]` Backend implementation uses Node.js
- `[x]` CLI application runs in terminal / GitHub Actions
- `[x]` `scripts/test.sh` exists and runs unit tests
- `[x]` `scripts/build.sh` exists and installs dependencies
- `[x]` `scripts/run.sh` exists and runs the CLI simulation
- `[x]` CLI writes output to `scripts/result.txt`
- `[x]` Output includes timestamps in `HH:MM:SS` format
- `[x]` Normal orders appear in `PENDING`
- `[x]` VIP orders are placed before Normal orders
- `[x]` VIP orders remain behind existing VIP orders
- `[x]` Order numbers are unique and increasing
- `[x]` Bots process one order at a time
- `[x]` Each order takes 10 seconds to process
- `[x]` Bots immediately process pending work when added
- `[x]` Bots become `IDLE` when no pending orders remain
- `[x]` Removing a bot destroys the newest bot first
- `[x]` Removing a busy bot returns its order to pending with correct priority
- `[x]` No persistence is used; everything runs in memory
- `[x]` Interactive CLI mode is implemented

## 10. Demo Scenarios

### Scenario A - VIP priority
1. Add Normal order #1001
2. Add Normal order #1002
3. Add VIP order #1003
4. Pending order order should be:
   - VIP #1003
   - Normal #1001
   - Normal #1002

### Scenario B - Immediate bot pickup
1. Add a Normal order
2. Add a bot
3. The bot should immediately pick up the pending order
4. After 10 seconds, the order should move to `COMPLETE`

### Scenario C - Remove busy bot
1. Add one or more orders
2. Add a bot so processing begins
3. Remove the newest bot before 10 seconds completes
4. The bot's current order should return to `PENDING`
5. The order should keep correct VIP/Normal positioning

### Scenario D - Multiple bots
1. Add two orders
2. Add two bots
3. Both orders should be processed concurrently
4. After 10 seconds, both should appear in `COMPLETE`

### Scenario E - Interactive status view
1. Run `npm run interactive`
2. Add orders and bots
3. Choose `5` to show detailed status
4. Observe:
   - bot status
   - pending order list
   - completed order list

## 11. Testing Strategy

The test suite uses Jest and fake timers.

Why fake timers are used:
- The controller uses `setTimeout()` for 10-second processing
- Fake timers allow the tests to simulate time passing instantly
- This keeps the test suite fast and deterministic

Current unit coverage includes:
- Order creation
- VIP insertion rules
- Increasing order IDs
- Immediate bot pickup behavior
- Completion after processing delay
- Idle bot behavior
- Sequential processing of multiple orders
- Bot removal behavior
- Correct reinsertion of interrupted orders
- Concurrent processing with multiple bots
- Status summary accuracy

At the time of writing, the suite contains 22 passing tests in `tests/order-controller.test.js`.

## 12. How to Run the Project

### Install dependencies

```bash
npm install
```

### Run unit tests

```bash
npm test
```

### Run the scripted simulation

```bash
npm start
```

or

```bash
node src/cli/simulation.js
```

### Run the interactive CLI

```bash
npm run interactive
```

### Run assessment shell scripts

```bash
bash scripts/build.sh
bash scripts/test.sh
bash scripts/run.sh
```

## 13. Output Behavior

### Simulation output
- Printed to stdout during execution
- Persisted to `scripts/result.txt`
- Includes a final summary section

### Interactive output
- Printed directly to the terminal
- Does not write to `result.txt`
- Intended for live demo and interview walkthrough

## 14. Known Design Decisions

- State is intentionally kept in memory only, per assignment requirement
- `OrderController` remains the main orchestrator to keep the external API simple
- Queue logic is extracted to its own controller for better separation of concerns
- Bot management is extracted to its own controller for SRP alignment
- Log text is centralized to avoid duplicated message strings
- Simulation includes small cosmetic pauses to make timestamps easier to read
- Interactive mode currently uses `rl.question()` for simpler terminal behavior

## 15. Suggested Future Improvements

These are not required for the assignment, but would be natural next steps:
- Add validation for unsupported order types
- Add unit tests for log output formatting
- Add integration tests for CLI scripts
- Add graceful interrupt handling in interactive mode
- Add a small README section linking to this documentation file
- Add optional configuration for processing duration in non-production demo runs

## 16. Conclusion

This project delivers a clean Node.js CLI implementation of the McDonald's automated order controller assignment.
It satisfies the required backend functionality, includes an interactive demonstration mode, and is structured to keep queue logic, bot management, orchestration, and logging responsibilities clearly separated.
