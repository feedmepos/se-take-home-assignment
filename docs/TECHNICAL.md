# Technical Documentation

McDonald's Order Management System — Backend CLI Application

---

## Table of Contents

1. [Overview](#1-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Architecture](#4-architecture)
5. [Module Reference](#5-module-reference)
6. [Data Flow](#6-data-flow)
7. [How to Build & Run](#7-how-to-build--run)
8. [Testing](#8-testing)
9. [CI/CD Pipeline](#9-cicd-pipeline)
10. [Design Decisions](#10-design-decisions)
11. [Related Documentation](#11-related-documentation)

---

## 1. Overview

A Node.js CLI application that simulates McDonald's automated order management with cooking bots. The system handles a priority queue (VIP orders before Normal), manages bot lifecycles (create, process, destroy), and enforces a 10-second processing time per order — all in memory with no external dependencies.

The application has two modes:

| Mode | Entry Point | Purpose |
|------|-------------|---------|
| **Scripted** | `index.js` | Automated simulation → outputs to `result.txt` for CI |
| **Interactive** | `interactive.js` | Live CLI with real-time dashboard for interview demo |

---

## 2. Tech Stack

```mermaid
graph LR
    subgraph Runtime
        NODE["Node.js 22<br/>(LTS)"]
    end

    subgraph Language
        JS["JavaScript<br/>CommonJS modules"]
    end

    subgraph Testing
        NT["node:test<br/>(built-in)"]
        NA["node:assert<br/>(built-in)"]
    end

    subgraph CI
        GHA["GitHub Actions"]
        GHF["GitHub Flow"]
    end

    NODE --> JS
    JS --> NT
    JS --> NA
    GHA --> GHF

    style NODE fill:#68a063,color:#fff
    style JS fill:#f7df1e,color:#000
    style NT fill:#4a90d9,color:#fff
    style NA fill:#4a90d9,color:#fff
    style GHA fill:#2088FF,color:#fff
```

| Component | Choice | Why |
|-----------|--------|-----|
| Runtime | Node.js 22.19.0 | Matches CI environment exactly |
| Language | Plain JavaScript | No build step, no TypeScript overhead |
| Module System | CommonJS (`require` / `module.exports`) | Simpler config, no `"type": "module"` needed |
| Test Framework | `node:test` + `node:assert` | Built into Node.js, zero install |
| Dependencies | **None** | Zero `npm install`, no `node_modules`, no supply chain risk |
| CI | GitHub Actions | Provided by the assignment |
| Git Workflow | GitHub Flow | Single branch → PR → merge |

---

## 3. Project Structure

```
se-take-home-assignment/
│
├── AGENTS.md                # Project knowledge for all LLM agents
├── CLAUDE.md                # Claude Code instructions → AGENTS.md
├── index.js                 # Entry: scripted simulation → result.txt
├── interactive.js           # Entry: interactive CLI for interview
├── package.json             # Project metadata, npm scripts (zero deps)
│
├── src/                     # Core business logic
│   ├── order.js             # Order data model
│   ├── bot.js               # Bot data model + processing logic
│   ├── order-queue.js       # Priority queue (VIP before Normal)
│   ├── order-controller.js  # Orchestrator — ties everything together
│   ├── logger.js            # Formatted output (shared by both modes)
│   └── timestamp.js         # Date/time formatting utility
│
├── tests/                   # All test files
│   ├── test.js              # Unit tests (node:test)
│   └── scenario-test.js     # Requirement-based scenarios (R1-R7)
│
├── scripts/                 # CI shell scripts
│   ├── build.sh             # Build step (verifies Node.js exists)
│   ├── test.sh              # Runs unit tests
│   ├── run.sh               # Runs simulation → writes result.txt
│   └── result.txt           # Generated simulation output
│
├── docs/                    # Design & specification documents
│   ├── TECHNICAL.md         # This file
│   ├── REQUIREMENTS.md      # Requirements breakdown with Mermaid diagrams
│   ├── CLI-DESIGN.md        # CLI visual specification
│   ├── PROPOSAL.md          # Implementation proposal
│   └── WORKFLOW.md          # Agent dispatch workflow
│
├── agent-review/            # Agent test/review logs (proof of work)
│
├── .github/
│   └── workflows/
│       └── backend-verify-result.yaml   # CI workflow
│
├── README.md                # Assignment instructions
└── LICENSE
```

### File Roles Diagram

```mermaid
graph TD
    subgraph EntryPoints["Entry Points"]
        IDX["index.js<br/>Scripted Mode"]
        INT["interactive.js<br/>Interactive Mode"]
    end

    subgraph Core["Core Business Logic (src/)"]
        OC["src/order-controller.js<br/>Orchestrator"]
        OQ["src/order-queue.js<br/>Priority Queue"]
        O["src/order.js<br/>Order Model"]
        B["src/bot.js<br/>Bot Model"]
    end

    subgraph Support["Support Modules (src/)"]
        L["src/logger.js<br/>Output Formatting"]
        TS["src/timestamp.js<br/>Date/Time Utility"]
    end

    subgraph Output["Output"]
        RT["scripts/result.txt<br/>Simulation Output"]
        TTY["Terminal<br/>Live Dashboard"]
    end

    subgraph Testing["Testing (tests/)"]
        T["tests/test.js<br/>Unit Tests"]
        TS2["tests/scenario-test.js<br/>Scenario Tests"]
    end

    IDX --> OC
    IDX --> L
    INT --> OC
    INT --> L

    OC --> OQ
    OC --> B
    OQ --> O
    B --> O

    L --> TS

    IDX -->|stdout redirect| RT
    INT -->|ANSI terminal| TTY

    T --> OC
    T --> OQ
    T --> O
    T --> B

    style IDX fill:#4CAF50,color:#fff
    style INT fill:#4CAF50,color:#fff
    style OC fill:#2196F3,color:#fff
    style OQ fill:#2196F3,color:#fff
    style O fill:#FF9800,color:#fff
    style B fill:#FF9800,color:#fff
    style L fill:#9C27B0,color:#fff
    style TS fill:#9C27B0,color:#fff
    style T fill:#F44336,color:#fff
```

### File Size Guide

Each module is intentionally small — a single responsibility that fits on one screen:

| File | Estimated Lines | Responsibility |
|------|----------------|----------------|
| `order.js` | ~25 | Order class with timestamps |
| `bot.js` | ~50 | Bot class with injectable timer |
| `order-queue.js` | ~45 | Priority queue with VIP/Normal insertion |
| `order-controller.js` | ~120 | Orchestration, event-driven assignment |
| `logger.js` | ~150 | All output formatting, tables, status board |
| `timestamp.js` | ~10 | `YYYY-MM-DD HH:MM:SS` and `HH:MM:SS` formatters |
| `index.js` | ~80 | Scripted simulation scenario |
| `interactive.js` | ~100 | Raw mode stdin, ANSI rendering, live clock |
| `test.js` | ~200 | All unit tests |

---

## 4. Architecture

### Layer Diagram

```mermaid
graph TD
    subgraph Presentation["Presentation Layer"]
        direction LR
        S["index.js<br/>(Scripted)"]
        I["interactive.js<br/>(Interactive)"]
        LG["logger.js<br/>(Formatting)"]
    end

    subgraph Business["Business Logic Layer"]
        direction LR
        CTRL["OrderController<br/>(Orchestrator)"]
    end

    subgraph Domain["Domain Layer"]
        direction LR
        Q["OrderQueue<br/>(Priority Queue)"]
        BM["Bot<br/>(Processing)"]
        OM["Order<br/>(Data)"]
    end

    subgraph Infra["Infrastructure"]
        direction LR
        TIMER["setTimeout / clearTimeout<br/>(Node.js built-in)"]
        STDIN["process.stdin<br/>(Raw Mode Input)"]
        STDOUT["process.stdout<br/>(ANSI Output)"]
    end

    S --> LG
    I --> LG
    S --> CTRL
    I --> CTRL

    CTRL --> Q
    CTRL --> BM
    Q --> OM
    BM --> OM

    BM --> TIMER
    I --> STDIN
    LG --> STDOUT

    style Presentation fill:#E8F5E9
    style Business fill:#E3F2FD
    style Domain fill:#FFF3E0
    style Infra fill:#F3E5F5
```

### Component Interaction

```mermaid
sequenceDiagram
    participant User
    participant Entry as index.js / interactive.js
    participant Ctrl as OrderController
    participant Queue as OrderQueue
    participant Bot as Bot
    participant Logger as logger.js

    Note over User,Logger: New Order Flow
    User->>Entry: [1] or [2]
    Entry->>Ctrl: addNormalOrder() / addVipOrder()
    Ctrl->>Queue: enqueue(order)
    Queue-->>Ctrl: order added at correct position
    Ctrl->>Ctrl: processNextOrder()
    Ctrl->>Bot: find IDLE bot
    alt IDLE bot available
        Ctrl->>Bot: startProcessing(order, onComplete)
        Bot-->>Logger: log pickup event
        Note over Bot: setTimeout(10000)
        Bot->>Ctrl: onComplete(order) after 10s
        Ctrl->>Queue: check for next order
    else No IDLE bot
        Note over Queue: Order waits in PENDING
    end
    Entry->>Logger: format and print output

    Note over User,Logger: Remove Bot Flow
    User->>Entry: [4]
    Entry->>Ctrl: removeBot()
    Ctrl->>Bot: pop newest bot
    alt Bot was PROCESSING
        Bot->>Bot: clearTimeout()
        Bot-->>Ctrl: return unfinished order
        Ctrl->>Queue: enqueue(returned order)
    end
    Ctrl-->>Logger: log destruction event
```

### Event-Driven Design

The system uses two trigger points that both call the same `processNextOrder()` method:

```mermaid
flowchart LR
    subgraph Triggers["Triggers for processNextOrder()"]
        T1["New order added<br/>(addNormalOrder / addVipOrder)"]
        T2["Bot finishes processing<br/>(onComplete callback)"]
    end

    T1 --> PNO["processNextOrder()"]
    T2 --> PNO

    PNO --> CHECK{IDLE bot<br/>AND<br/>pending order?}
    CHECK -->|Yes| ASSIGN["Assign order to bot<br/>bot.startProcessing()"]
    CHECK -->|No| NOOP["No action"]

    ASSIGN --> T2
```

No polling. No arbitrary delays. No `setInterval` checking for work. The system reacts only when state changes.

---

## 5. Module Reference

### order.js

```
Class: Order
├── Constructor(id, type)
│   ├── id: number              Auto-incremented by controller
│   ├── type: 'NORMAL' | 'VIP'  Set at creation, never changes
│   ├── status: 'PENDING'       Initial state
│   ├── createdAt: Date         When order was placed
│   ├── pickedUpAt: null        Set when bot starts processing
│   └── completedAt: null       Set when bot finishes
│
├── Methods
│   └── toString()              "Normal Order #1" or "⭐ VIP Order #2"
│
└── Exports: { Order }
```

### bot.js

```
Class: Bot
├── Constructor(id, processingTime = 10000)
│   ├── id: number              Auto-incremented by controller
│   ├── status: 'IDLE'          Initial state
│   ├── currentOrder: null      The order being processed
│   ├── processingTime: number  Milliseconds (injectable for tests)
│   ├── idleSince: Date         When bot became idle
│   └── timer: null             setTimeout reference
│
├── Methods
│   ├── startProcessing(order, onComplete)
│   │   ├── Sets status → 'PROCESSING'
│   │   ├── Sets order.status → 'PROCESSING'
│   │   ├── Sets order.pickedUpAt → now
│   │   ├── Starts setTimeout(processingTime)
│   │   └── Calls onComplete(order) when timer fires
│   │
│   └── stopProcessing()
│       ├── Calls clearTimeout(timer)
│       ├── Sets order.status → 'PENDING'
│       ├── Sets status → 'IDLE'
│       └── Returns the unfinished order (or null)
│
└── Exports: { Bot }
```

### order-queue.js

```
Class: OrderQueue
├── Constructor()
│   └── orders: []              Internal array
│
├── Methods
│   ├── enqueue(order)
│   │   ├── VIP: insert after last VIP, before first Normal
│   │   └── Normal: append to end
│   │
│   ├── dequeue()
│   │   └── Returns and removes first order (index 0)
│   │
│   ├── size()
│   │   └── Returns orders.length
│   │
│   ├── isEmpty()
│   │   └── Returns orders.length === 0
│   │
│   ├── snapshot()
│   │   └── Returns "⭐#2 → #1 → #3" format string
│   │
│   └── toArray()
│       └── Returns shallow copy of orders array
│
└── Exports: { OrderQueue }
```

**Priority insertion algorithm:**

```mermaid
flowchart TD
    A["enqueue(order)"] --> B{order.type?}
    B -->|NORMAL| C["orders.push(order)<br/>Append to end"]
    B -->|VIP| D["let i = 0"]
    D --> E{"orders[i] exists<br/>AND type === 'VIP'?"}
    E -->|Yes| F["i++"]
    F --> E
    E -->|No| G["orders.splice(i, 0, order)<br/>Insert at position i"]
```

### order-controller.js

```
Class: OrderController
├── Constructor(processingTime = 10000)
│   ├── queue: OrderQueue       Pending orders
│   ├── bots: []                Active bots
│   ├── completed: []           Completed orders
│   ├── nextOrderId: 1          Auto-increment counter
│   ├── nextBotId: 1            Auto-increment counter
│   └── processingTime: number  Passed to new Bot instances
│
├── Methods
│   ├── addNormalOrder()
│   │   ├── Creates Order(id, 'NORMAL')
│   │   ├── queue.enqueue(order)
│   │   ├── Calls processNextOrder()
│   │   └── Returns order
│   │
│   ├── addVipOrder()
│   │   ├── Creates Order(id, 'VIP')
│   │   ├── queue.enqueue(order)  (priority insert)
│   │   ├── Calls processNextOrder()
│   │   └── Returns order
│   │
│   ├── addBot()
│   │   ├── Creates Bot(id, processingTime)
│   │   ├── bots.push(bot)
│   │   ├── Calls processNextOrder()
│   │   └── Returns bot
│   │
│   ├── removeBot()
│   │   ├── Pops last bot from bots[] (newest)
│   │   ├── Calls bot.stopProcessing()
│   │   ├── If returned order: queue.enqueue(order)
│   │   └── Returns removed bot (or null if no bots)
│   │
│   ├── processNextOrder() [private]
│   │   ├── Finds IDLE bots
│   │   ├── For each: if queue not empty, assign order
│   │   └── bot.startProcessing(order, onComplete)
│   │
│   └── getStatus()
│       └── Returns { bots, pending, completed, summary }
│
└── Exports: { OrderController }
```

### logger.js

```
Module: logger
├── Event Log Functions
│   ├── logTimestamp()                    "[YYYY-MM-DD HH:MM:SS]"
│   ├── logOrderCreated(order)           "✓ Normal Order #1 created"
│   ├── logBotCreated(bot)               "✓ Bot #1 created"
│   ├── logBotPickup(bot, order, wait)   "🤖 Bot #1 → picked up ⭐ VIP Order #2 (waited 2s)"
│   ├── logBotCompleted(bot, order, t)   "✓ Bot #1 completed ⭐ VIP Order #2 (10s)"
│   ├── logBotIdle(bot)                  "🤖 Bot #1 idle — no pending orders"
│   ├── logBotDestroyed(bot, reason)     "✗ Bot #2 destroyed (was idle)"
│   ├── logOrderReturned(order, wait)    "↩ ⭐ VIP Order #4 returned to PENDING (waited 5s)"
│   └── logQueueSnapshot(orders)         "📋 Queue: ⭐#2 → #1 → #3"
│
├── Rendering Functions (Interactive Mode)
│   ├── renderMenu(clock)                Main menu with live clock
│   ├── renderStatusBoard(state)         Full status board with tables
│   └── renderSummary(state)             Final summary box
│
├── Table Helpers
│   ├── renderBotsTable(bots)            Bot details with progress bars
│   ├── renderPendingTable(orders)       Pending queue with wait times
│   ├── renderCompleteTable(orders)      Completed with timestamps
│   └── renderProgressBar(elapsed, total) "████████░░░░ 60%"
│
└── Exports: { all above functions }
```

### timestamp.js

```
Module: timestamp
├── getTimestamp()        Returns "YYYY-MM-DD HH:MM:SS"
├── getTimeOnly()        Returns "HH:MM:SS"
└── getDateOnly()        Returns "YYYY-MM-DD"

Exports: { getTimestamp, getTimeOnly, getDateOnly }
```

### index.js (Scripted Mode)

```
Flow:
1. Create OrderController
2. Print header box
3. Execute simulation steps with delays
4. Print section headers between phases
5. Await all processing completion
6. Print final summary box
7. Process exits cleanly (no orphaned timers)

Output: stdout → piped to scripts/result.txt by run.sh
```

### interactive.js (Interactive Mode)

```
Flow:
1. Enable raw mode (process.stdin.setRawMode(true))
2. Render main menu with live clock
3. Listen for keypress events
4. On valid key: execute command, print event log
5. On [5]: switch to status board view (live refresh)
6. On [0]: clean up timers, exit
7. Bot completions print inline regardless of current view

Input:  Single keypress, no Enter needed
Output: ANSI terminal with cursor control
```

---

## 6. Data Flow

### Order Lifecycle

```mermaid
stateDiagram-v2
    [*] --> PENDING: Order created<br/>(addNormalOrder / addVipOrder)

    PENDING --> PROCESSING: Bot picks up<br/>(startProcessing)

    PROCESSING --> COMPLETE: Timer fires after 10s<br/>(onComplete callback)

    PROCESSING --> PENDING: Bot destroyed mid-processing<br/>(stopProcessing → re-enqueue)

    COMPLETE --> [*]: Final state

    note right of PENDING
        VIP orders positioned
        before Normal orders
        in the queue
    end note

    note right of PROCESSING
        order.pickedUpAt = now
        Bot timer running
    end note

    note right of COMPLETE
        order.completedAt = now
        Moved to completed[]
    end note
```

### Bot Lifecycle

```mermaid
stateDiagram-v2
    [*] --> IDLE: addBot()

    IDLE --> PROCESSING: processNextOrder()<br/>found pending order

    PROCESSING --> IDLE: onComplete + queue empty

    PROCESSING --> PROCESSING: onComplete + queue has more<br/>(pick up next order)

    IDLE --> [*]: removeBot() while idle

    PROCESSING --> [*]: removeBot() while processing<br/>(clearTimeout, return order)

    note right of IDLE
        bot.idleSince = now
        Waiting for trigger
    end note

    note right of PROCESSING
        bot.currentOrder set
        bot.timer running
        10s countdown
    end note
```

### Priority Queue — Visual Walkthrough

```mermaid
graph TD
    subgraph Step1["Step 1: Add Normal #1"]
        Q1["[ Normal#1 ]"]
    end

    subgraph Step2["Step 2: Add VIP #2"]
        Q2["[ ⭐VIP#2 → Normal#1 ]"]
    end

    subgraph Step3["Step 3: Add Normal #3"]
        Q3["[ ⭐VIP#2 → Normal#1 → Normal#3 ]"]
    end

    subgraph Step4["Step 4: Add VIP #4"]
        Q4["[ ⭐VIP#2 → ⭐VIP#4 → Normal#1 → Normal#3 ]"]
    end

    subgraph Step5["Step 5: Dequeue (bot picks up)"]
        Q5["[ ⭐VIP#4 → Normal#1 → Normal#3 ]"]
        PICKED["⭐VIP#2 → Bot #1"]
    end

    Step1 --> Step2 --> Step3 --> Step4 --> Step5
```

### Full Simulation Timeline

```mermaid
gantt
    title Scripted Simulation Timeline
    dateFormat ss
    axisFormat %Ss

    section Orders
    Create Normal #1        :o1, 00, 1s
    Create VIP #2           :o2, 00, 1s
    Create Normal #3        :o3, 00, 1s
    Create VIP #4           :o4, 11, 1s

    section Bot #1
    Created                 :b1c, 01, 1s
    Processing VIP #2       :b1p1, 01, 10s
    Processing Normal #3    :b1p2, 11, 10s
    Idle                    :b1i, 21, 3s

    section Bot #2
    Created                 :b2c, 01, 1s
    Processing Normal #1    :b2p1, 01, 10s
    Idle                    :b2i1, 11, 1s
    Processing VIP #4       :b2p2, 12, 10s
    Destroyed               :b2d, 22, 1s

    section Queue State
    VIP#2, N#1, N#3         :qs1, 00, 1s
    N#3                     :qs2, 01, 10s
    Empty                   :qs3, 11, 1s
    Empty                   :qs4, 12, 10s
```

---

## 7. How to Build & Run

### Prerequisites

| Requirement | Version | Check |
|-------------|---------|-------|
| Node.js | 22.x | `node --version` |
| npm | 10.x | `npm --version` |
| Git | any | `git --version` |

### Quick Start

```bash
# Clone the repository
git clone <your-fork-url>
cd se-take-home-assignment

# Build (verifies Node.js is installed)
./scripts/build.sh

# Run tests
./scripts/test.sh

# Run scripted simulation → generates scripts/result.txt
./scripts/run.sh

# View the output
cat scripts/result.txt

# Run interactive CLI (for interview demo)
node interactive.js
```

### npm Scripts

```bash
npm start          # Same as: node index.js | tee scripts/result.txt
                   #   → prints to console AND writes scripts/result.txt
npm test           # Same as: node --test test.js
npm run interactive  # Same as: node interactive.js
```

### Shell Scripts Detail

#### `scripts/build.sh`

```bash
#!/bin/bash
echo "Building CLI application..."

# Verify Node.js is available
if ! command -v node &> /dev/null; then
    echo "Node.js is required but not installed."
    exit 1
fi

echo "Node.js $(node --version) detected"
echo "Build completed"
```

No `npm install` needed — zero dependencies.

#### `scripts/test.sh`

```bash
#!/bin/bash
echo "Running unit tests..."
node --test test.js
echo "Unit tests completed"
```

Uses `node:test` built-in runner. Exit code 0 = all pass, 1 = failures.

#### `scripts/run.sh`

```bash
#!/bin/bash
echo "Running CLI application..."
node index.js > scripts/result.txt
echo "CLI application execution completed"
```

Pipes stdout to `scripts/result.txt`. The simulation takes ~35 seconds (multiple 10s processing cycles).

### Execution Flow

```mermaid
flowchart LR
    subgraph CI["GitHub Actions"]
        B["build.sh<br/>Verify Node.js"] --> T["test.sh<br/>Run unit tests"]
        T --> R["run.sh<br/>Run simulation"]
        R --> V["Verify result.txt<br/>exists + has timestamps"]
    end

    subgraph Local["Local Development"]
        L1["node interactive.js<br/>Interactive mode"]
        L2["node index.js<br/>Scripted mode"]
        L3["node --test test.js<br/>Run tests"]
    end
```

---

## 8. Testing

### Framework

- **Runner:** `node:test` (built-in since Node.js 18)
- **Assertions:** `node:assert` (built-in)
- **No external test dependencies**

### Test Structure

```js
const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('OrderQueue', () => {
  it('should insert VIP before Normal', () => {
    // ...
    assert.strictEqual(queue.dequeue().type, 'VIP');
  });
});
```

### Test Coverage Map

```mermaid
graph TD
    subgraph Tests["test.js"]
        T1["describe: Order"]
        T2["describe: OrderQueue"]
        T3["describe: Bot"]
        T4["describe: OrderController"]
    end

    subgraph Modules["Source Modules"]
        M1["order.js"]
        M2["order-queue.js"]
        M3["bot.js"]
        M4["order-controller.js"]
    end

    T1 -->|tests| M1
    T2 -->|tests| M2
    T3 -->|tests| M3
    T4 -->|integration tests| M4
    T4 -.->|indirectly tests| M1
    T4 -.->|indirectly tests| M2
    T4 -.->|indirectly tests| M3
```

### Test Cases by Module

#### Order Tests

| Test | Verifies |
|------|----------|
| Creation with defaults | `status === 'PENDING'`, `createdAt` set |
| Type assignment | `type === 'NORMAL'` or `'VIP'` |
| toString format | `"Normal Order #1"` / `"⭐ VIP Order #2"` |

#### OrderQueue Tests

| Test | Verifies |
|------|----------|
| Normal orders FIFO | Dequeue returns in insertion order |
| VIP before Normal | VIP inserted after last VIP, before first Normal |
| Multiple VIPs ordering | Second VIP goes after first VIP, not before |
| Dequeue from empty | Returns `null` or `undefined` |
| Re-enqueue VIP | VIP returned from bot goes before all Normal |
| Re-enqueue Normal | Normal returned from bot goes to end |
| Snapshot format | Returns `"⭐#2 → #1 → #3"` |

#### Bot Tests

| Test | Verifies |
|------|----------|
| Creation defaults | `status === 'IDLE'`, `currentOrder === null` |
| Start processing | Status changes to `'PROCESSING'`, order assigned |
| Stop processing | Timer cleared, order returned, status → `'IDLE'` |
| Injectable timer | `processingTime: 50` completes in ~50ms |
| Completion callback | `onComplete` fires after timer |

#### OrderController Tests (Integration)

| Test | Verifies |
|------|----------|
| Add normal order | Order in pending queue, correct position |
| Add VIP order | VIP before Normal in queue |
| Add bot → processes | IDLE bot picks up first pending order |
| Remove newest bot | Last-added bot is removed |
| Remove bot mid-processing | Order returns to queue at correct position |
| Bot goes IDLE | Bot IDLE when queue empty after completion |
| Full end-to-end | Multiple orders + bots, VIP priority respected throughout |

### Running Tests

```bash
# Run all tests
node --test test.js

# Run with verbose output
node --test --test-reporter spec test.js

# Via npm
npm test

# Via shell script
./scripts/test.sh
```

### Injectable Processing Time

The key testability design — processing time is a constructor parameter:

```
Production:  new OrderController()           → 10000ms (default)
Tests:       new OrderController(50)         → 50ms (fast)
```

Tests run the real `setTimeout` path at 50ms instead of bypassing it. This validates the actual async flow — timer setup, callback execution, order state transitions — all in under a second.

---

## 9. CI/CD Pipeline

### GitHub Actions Workflow

```mermaid
flowchart TD
    subgraph Trigger["Trigger"]
        PR["Pull Request<br/>opened / synchronize / reopened / edited"]
    end

    subgraph Job["verify-result (ubuntu-latest)"]
        S1["Checkout code"]
        S2["Setup Go 1.23.9"]
        S3["Setup Node.js 22.19.0"]
        S4["Verify versions"]
        S5["chmod +x scripts/*.sh"]
        S6["./scripts/test.sh"]
        S7["./scripts/build.sh"]
        S8["./scripts/run.sh"]
        S9["Verify result.txt"]
    end

    subgraph Checks["Verification"]
        C1["File exists?"]
        C2["File not empty?"]
        C3["Contains HH:MM:SS<br/>timestamp pattern?"]
    end

    Trigger --> Job
    S1 --> S2 --> S3 --> S4 --> S5
    S5 --> S6 --> S7 --> S8 --> S9
    S9 --> C1 --> C2 --> C3

    C3 -->|All pass| PASS["✅ Check passes"]
    C3 -->|Any fail| FAIL["❌ Check fails"]

    style PASS fill:#4CAF50,color:#fff
    style FAIL fill:#F44336,color:#fff
```

### CI Verification Regex

The workflow checks `scripts/result.txt` with:

```bash
grep -E '[0-9]{2}:[0-9]{2}:[0-9]{2}' scripts/result.txt
```

Our timestamp format `YYYY-MM-DD HH:MM:SS` matches this pattern (the `HH:MM:SS` portion).

### Submission Workflow

```mermaid
flowchart LR
    A["Fork repo"] --> B["Create feature branch"]
    B --> C["Implement solution"]
    C --> D["Run tests locally"]
    D --> E["Push to fork"]
    E --> F["Create Pull Request"]
    F --> G["CI runs automatically"]
    G --> H{All checks pass?}
    H -->|Yes| I["Ready for review"]
    H -->|No| J["Fix and push"]
    J --> G
```

---

## 10. Design Decisions

### Why These Choices?

```mermaid
mindmap
    root((Design<br/>Decisions))
        Zero Dependencies
            Faster CI
            No supply chain risk
            Shows fundamentals
            Interview signal
        CommonJS
            No config overhead
            Simpler than ESM
            Works everywhere
        Flat Structure
            5 modules total
            No nesting needed
            Quick navigation
        Injectable Timer
            10s production
            50ms tests
            Real async path
            No mocking
        Event-Driven
            Two trigger points
            No polling
            No setInterval
            Deterministic
        Separate Entry Points
            index.js for CI
            interactive.js for demo
            Same core logic
```

### Trade-off Analysis

| Decision | Pro | Con | Why We Chose It |
|----------|-----|-----|----------------|
| Zero deps | Fast CI, no risk | Reinvent some utilities | Project is small enough, utilities are trivial |
| CommonJS | No config needed | Not "modern" ES modules | ESM adds complexity with no benefit here |
| Flat layout | Quick to navigate | Doesn't scale | This project will never grow beyond ~10 files |
| `node:test` | Built-in, standard | Less feature-rich than Jest | We need `describe/it/assert` — that's enough |
| Injectable timer | Real async testing | Slightly more complex constructor | Eliminates all timer mocking complexity |
| Two entry points | Clean separation | Some shared code | Logger module handles all shared formatting |

---

## 11. Related Documentation

| Document | Path | Purpose |
|----------|------|---------|
| Requirements | [`docs/REQUIREMENTS.md`](./REQUIREMENTS.md) | All 7 requirements with Mermaid diagrams and examples |
| CLI Design | [`docs/CLI-DESIGN.md`](./CLI-DESIGN.md) | Exact visual specification for all CLI screens |
| Proposal | [`docs/PROPOSAL.md`](./PROPOSAL.md) | Implementation strategy and decisions |
| Assignment | [`README.md`](../README.md) | Original assignment instructions |
| CI Workflow | [`.github/workflows/backend-verify-result.yaml`](../.github/workflows/backend-verify-result.yaml) | GitHub Actions pipeline definition |
