# Agent Instructions — McDonald's Order Management System

This document provides project knowledge and instructions for **any LLM agent** working on this codebase. Read this file completely before making any changes.

---

## Project Overview

| Field | Value |
|-------|-------|
| **Name** | McDonald's Order Management System |
| **Type** | Node.js CLI Application |
| **Runtime** | Node.js 22 (CommonJS modules) |
| **Dependencies** | Zero — no external packages |
| **Purpose** | FeedMe Software Engineer take-home assignment |
| **Path** | Repository root (the directory you cloned into) |

The application simulates McDonald's automated cooking bots that process customer orders with VIP priority handling. It has two modes: **scripted** (for CI) and **interactive** (for interview demo).

---

## Project Structure

```
se-take-home-assignment/
├── AGENTS.md                 # THIS FILE — read first
├── CLAUDE.md                 # Claude Code specific instructions → points here
├── index.js                  # Entry: scripted simulation → stdout → result.txt
├── interactive.js             # Entry: interactive CLI with live dashboard
├── package.json              # Zero deps, npm scripts
│
├── src/                      # Core business logic (DO NOT add deps here)
│   ├── order.js              # Order class (id, type, status, timestamps)
│   ├── bot.js                # Bot class (injectable processingTime, timer)
│   ├── order-queue.js        # Priority queue (VIP before Normal, FIFO within)
│   ├── order-controller.js   # Orchestrator (ties queue + bots + events)
│   ├── logger.js             # All output formatting (event logs + tables)
│   └── timestamp.js          # Date/time formatters
│
├── tests/                    # All test files
│   ├── test.js               # Unit tests (node:test + node:assert)
│   └── scenario-test.js      # Requirement-based scenario tests (R1-R7)
│
├── scripts/                  # CI shell scripts
│   ├── build.sh              # Verify Node.js exists
│   ├── test.sh               # Run: node --test tests/test.js
│   ├── run.sh                # Run: node index.js > scripts/result.txt
│   └── result.txt            # Generated simulation output
│
├── docs/                     # Design & specification documents
│   ├── PROPOSAL.md           # Architecture decisions, design rationale
│   ├── REQUIREMENTS.md       # All 7 requirements with Mermaid diagrams
│   ├── CLI-DESIGN.md         # Exact CLI visual output specification
│   ├── TECHNICAL.md          # Technical reference (modules, data flow, API)
│   └── WORKFLOW.md           # Agent dispatch workflow for testing
│
├── agent-review/             # Agent test/review logs (proof of work)
│   └── *.md                  # Each agent writes its log here
│
└── .github/workflows/
    └── backend-verify-result.yaml  # CI pipeline
```

---

## Rules for All Agents

### 1. Module System

- **CommonJS only** — use `require()` and `module.exports`
- Do NOT use ES module syntax (`import`/`export`)
- No `"type": "module"` in package.json

### 2. Zero Dependencies

- Do NOT add any npm packages
- Do NOT run `npm install` (there's nothing to install)
- Only use Node.js built-in modules: `node:test`, `node:assert`, `fs`, `path`

### 3. File Organization

- Core logic goes in `src/`
- Tests go in `tests/`
- Entry points (`index.js`, `interactive.js`) stay at project root
- Shell scripts stay in `scripts/`
- Documentation stays in `docs/`
- Agent review logs go in `agent-review/`

### 4. Import Paths

```javascript
// From entry points (index.js, interactive.js):
const { OrderController } = require('./src/order-controller');
const logger = require('./src/logger');

// From tests (tests/*.js):
const { Order } = require('../src/order');
const { OrderController } = require('../src/order-controller');

// Within src/ (src/*.js):
const { Order } = require('./order');
const { Bot } = require('./bot');
```

### 5. Testing

```bash
# Unit tests
node --test tests/test.js

# Scenario tests (requirement-based)
node --test tests/scenario-test.js

# Run simulation
node index.js

# Full CI pipeline
./scripts/build.sh && ./scripts/test.sh && ./scripts/run.sh
```

### 6. Agent Review Logs

When performing testing or review work, write your findings to `agent-review/`:

```
agent-review/
├── unit-test-YYYY-MM-DD.md
├── scenario-test-YYYY-MM-DD.md
├── cli-review-YYYY-MM-DD.md
├── code-review-YYYY-MM-DD.md
└── simulation-verify-YYYY-MM-DD.md
```

Each log file must include:
- Agent role/task
- Date and time
- Steps performed
- Results (PASS/FAIL per item)
- Issues found and fixes applied
- Final verdict

---

## Architecture Quick Reference

```
                     ┌─────────────────┐
                     │   Entry Points   │
                     │  index.js        │
                     │  interactive.js  │
                     └────────┬─────────┘
                              │
                     ┌────────▼─────────┐
                     │ OrderController   │  ← Orchestrator
                     │ (order-controller)│
                     └──┬──────────┬────┘
                        │          │
               ┌────────▼──┐  ┌───▼────────┐
               │ OrderQueue │  │    Bot      │
               │ (priority) │  │ (timer)     │
               └────────┬───┘  └───┬────────┘
                        │          │
                     ┌──▼──────────▼──┐
                     │     Order       │  ← Data model
                     └─────────────────┘

    ┌──────────┐
    │  logger   │  ← Output formatting (used by entry points)
    │ timestamp │
    └──────────┘
```

### Key Design Patterns

1. **Event-driven assignment** — `processNextOrder()` is called on two triggers:
   - New order added → check for idle bots
   - Bot finishes processing → check for pending orders

2. **Injectable processing time** — `OrderController(processingTime)` defaults to 10000ms, tests use 50ms

3. **Callback-based events** — `controller.onBotPickup`, `onBotCompleted`, `onBotIdle` are set by entry points for logging

---

## The 7 Requirements (Summary)

| # | Requirement | Key Logic |
|---|-------------|-----------|
| R1 | Normal order → PENDING | `queue.enqueue(order)` appends to end |
| R2 | VIP order before Normal | `queue.enqueue(vipOrder)` inserts after last VIP |
| R3 | Unique increasing IDs | `nextOrderId++` counter in controller |
| R4 | Bot processes in 10s | `setTimeout(processingTime)` in `bot.startProcessing()` |
| R5 | Bot goes IDLE | Checks queue after completion, stays IDLE if empty |
| R6 | Remove newest bot | `bots.pop()`, `clearTimeout`, re-enqueue returned order |
| R7 | No persistence | All state in memory — arrays and class instances |

See `docs/REQUIREMENTS.md` for full breakdown with Mermaid diagrams.

---

## CI Pipeline

The GitHub Actions workflow (`backend-verify-result.yaml`) runs:

```
build.sh → test.sh → run.sh → verify result.txt
```

Verification checks:
1. `scripts/result.txt` exists
2. `scripts/result.txt` is not empty
3. Contains timestamps matching `[0-9]{2}:[0-9]{2}:[0-9]{2}`

---

## Common Tasks

### Adding a new test

```javascript
// In tests/test.js or tests/scenario-test.js
describe('My New Test Group', () => {
  it('should do something', () => {
    const ctrl = new OrderController(50); // 50ms for fast tests
    // ... test logic
  });
});
```

### Modifying CLI output

All output formatting is in `src/logger.js`. Both `index.js` and `interactive.js` use these functions. Change the format in one place.

### Changing the simulation scenario

Edit `index.js` — the simulation steps are sequential with `await sleep()` between phases.

### Debugging

```bash
# Run simulation with visible output
node index.js

# Run interactive mode
node interactive.js

# Run a single test file
node --test tests/test.js

# Run tests with verbose output
node --test --test-reporter spec tests/test.js
```

---

## Reference Documents

| Document | When to Read |
|----------|-------------|
| `docs/REQUIREMENTS.md` | Understanding what the system must do |
| `docs/TECHNICAL.md` | Understanding how the system is built |
| `docs/CLI-DESIGN.md` | Implementing or modifying CLI output |
| `docs/PROPOSAL.md` | Understanding design decisions and trade-offs |
| `docs/WORKFLOW.md` | Dispatching agents for testing and review |
