# FeedMe Take-Home Assignment — Implementation Proposal

## Problem Statement

McDonald's wants an automated order management system with cooking bots. We need a **Node.js CLI application** that simulates an order queue with priority handling (VIP vs Normal), bot lifecycle management, and timed order processing — all runnable in GitHub Actions via the provided shell scripts.

---

## Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| All 7 requirements pass | Manual + unit test coverage | 100% |
| GitHub Actions CI passes | `backend-verify-result` workflow | Green |
| Clean, readable code | Single-responsibility modules, clear naming | Interview-ready |
| LLM-friendly codebase | Small focused files, consistent patterns | Easy to navigate and modify |

---

## Non-Goals

- No database / persistence — all in-memory per the spec
- No frontend UI — backend CLI only
- No over-engineering (no DI frameworks, ORMs, message queues)
- No Docker — runs directly on Node.js 22 in GitHub Actions

---

## Learnings from Sample Study (demo/nodejs)

Studied the reference implementation to understand conventions and identify areas for improvement:

| Sample Observation | Our Approach |
|--------------------|-------------|
| Flat file structure (all at root) | Keep flat — this project is too small for nested `src/models/services` directories |
| CommonJS (`require/module.exports`) | Same — simpler, no `"type": "module"` config needed |
| Single `order-controller.js` with all 3 classes | Split into focused modules — better for LLM tracking and interview modification |
| Custom test runner (manual assert) | Use `node:test` + `node:assert` — built-in, zero deps, standard output format |
| Processing time hardcoded at 10s, tests bypass via `completeProcessing()` | Inject `processingTime` via constructor — tests use short durations, no workarounds |
| Demo ends before all orders finish processing | Properly await all processing before printing final status |
| `setTimeout(100)` delay in completion callback | Direct synchronous callback — no arbitrary delays |
| Timestamp format `YYYY-MM-DD HH:MM:SS` | Use `HH:MM:SS` — matches CI regex check and the `result.txt` sample format |

---

## Technical Approach

### Stack

- **Runtime:** Node.js 22 (matches CI environment)
- **Language:** Plain JavaScript, CommonJS modules
- **Testing:** Node.js built-in `node:test` + `node:assert` (zero dependencies)
- **No external dependencies** — the entire project runs with zero `npm install`

### Why Zero Dependencies?

1. Faster CI — no `npm install` step needed
2. No supply chain risk
3. Forces clean code — no framework magic to hide behind
4. Interview signal — shows you understand the fundamentals

---

## Architecture — Organized & Modular

```
se-take-home-assignment/
├── AGENTS.md              # Project knowledge for all LLM agents
├── CLAUDE.md              # Claude Code instructions → AGENTS.md
├── index.js               # Entry: scripted simulation → result.txt
├── interactive.js         # Entry: interactive CLI for interview
├── package.json           # Zero deps, npm scripts
│
├── src/                   # Core business logic
│   ├── order.js           # Order class (id, type, status, timestamps)
│   ├── bot.js             # Bot class (injectable timer, start/stop)
│   ├── order-queue.js     # Priority queue: VIP before Normal
│   ├── order-controller.js # Orchestrator — ties queue + bots + events
│   ├── logger.js          # All output formatting (event logs + tables)
│   └── timestamp.js       # Date/time formatters
│
├── tests/                 # All test files
│   ├── test.js            # Unit tests (node:test)
│   └── scenario-test.js   # Requirement-based scenarios (R1-R7)
│
├── scripts/               # CI shell scripts
│   ├── build.sh           # Verify Node.js exists
│   ├── test.sh            # node --test tests/test.js
│   ├── run.sh             # node index.js > scripts/result.txt
│   └── result.txt         # Generated output
│
├── docs/                  # Design & specification documents
│   ├── PROPOSAL.md        # This file
│   ├── REQUIREMENTS.md    # 7 requirements with Mermaid diagrams
│   ├── CLI-DESIGN.md      # CLI visual output specification
│   ├── TECHNICAL.md       # Technical reference
│   └── WORKFLOW.md        # Agent dispatch workflow
│
└── agent-review/          # Agent test/review logs (proof of work)
```

### Why This Structure?

| Decision | Reason |
|----------|--------|
| `src/` for core logic | Separates business logic from entry points, tests, and config |
| `tests/` for all tests | Clean separation, easy to find, consistent import paths |
| Each class in its own file | LLM can read/modify one concern without loading everything |
| Separate `order-queue.js` | Priority insertion logic is the trickiest part — isolate and test it |
| `agent-review/` for logs | Proof of work from agent testing sessions |
| `AGENTS.md` at root | Universal agent instructions, read-first for any LLM |

---

## Data Model

### Order

```
{
  id: number            // Auto-incrementing, starts at 1
  type: 'NORMAL' | 'VIP'
  status: 'PENDING' | 'PROCESSING' | 'COMPLETE'
  createdAt: Date
}
```

### Bot

```
{
  id: number            // Auto-incrementing, starts at 1
  status: 'IDLE' | 'PROCESSING'
  currentOrder: Order | null
  timer: Timer | null   // setTimeout reference for processing
}
```

---

## Core Logic Design

### OrderQueue — Priority Insertion

The queue is an array. On `enqueue(order)`:
- If `order.type === 'VIP'`: find the index of the first Normal order, insert before it (or append if all are VIP)
- If `order.type === 'NORMAL'`: append to end

`dequeue()` always takes from index 0 (highest priority).

This handles all cases:
- Normal orders → FIFO at the tail
- VIP orders → FIFO among VIPs, always before any Normal
- Re-enqueue after bot removal → same logic, correct position

### Bot — Injectable Processing Time

```js
class Bot {
  constructor(id, processingTime = 10000) { ... }
  startProcessing(order, onComplete) {
    this.timer = setTimeout(() => { ... onComplete(order) }, this.processingTime);
  }
}
```

Tests pass `processingTime: 50` for fast execution. No need to manually call `completeProcessing()` or mock timers.

### OrderController — Event-Driven Assignment

Two trigger points for assigning orders to bots:
1. **New order added** → check for idle bots
2. **Bot finishes processing** → check for pending orders

Both call the same `processNextOrder()` method. No polling, no arbitrary delays.

---

## Requirement → Implementation Mapping

| # | Requirement | Implementation |
|---|------------|----------------|
| 1 | New Normal Order → PENDING | `controller.addNormalOrder()` → `queue.enqueue(order)` at tail |
| 2 | VIP Order before Normal, after existing VIP | `queue.enqueue(vipOrder)` — inserts after last VIP via index scan |
| 3 | Order number unique & increasing | Controller maintains `nextOrderId` counter |
| 4 | +Bot → process pending, 10s, then next | `controller.addBot()` → bot created → `processNextOrder()` → `setTimeout(10000)` → on complete, try next |
| 5 | Bot IDLE when no pending orders | After completing, bot checks queue — if empty, stays `IDLE` until next trigger |
| 6 | -Bot → destroy newest, return order to queue | `controller.removeBot()` → pop last bot → `clearTimeout` → `queue.enqueue(returnedOrder)` (same priority logic) |
| 7 | No persistence | All state lives in class instances |

### Requirement 6 — The Tricky One

When a bot is destroyed mid-processing:
1. `clearTimeout` to stop the 10s timer
2. Set order status back to `PENDING`
3. Re-enqueue using the same priority insertion logic (VIP goes before Normal, Normal goes to end)

This is correct because re-enqueue respects the order's type — a VIP order returned mid-processing still has `type: 'VIP'` and will be placed before all Normal orders.

---

## CLI Simulation Scenario

The `index.js` runs a scripted demo that exercises **every requirement** and waits for all processing to complete before printing final status:

```
Step 1:  Create Normal Order #1          → PENDING
Step 2:  Create VIP Order #2             → PENDING (before #1)
Step 3:  Create Normal Order #3          → PENDING (after #1)
Step 4:  Add Bot #1                      → picks up VIP #2 (priority)
Step 5:  Add Bot #2                      → picks up Normal #1 (next)
Step 6:  Wait 10s                        → Bot #1 completes VIP #2, picks up Normal #3
                                         → Bot #2 completes Normal #1, goes IDLE
Step 7:  Create VIP Order #4             → Bot #2 picks it up immediately (was IDLE)
Step 8:  Wait 10s                        → Both bots complete
Step 9:  Remove Bot #2                   → destroyed (IDLE, no order to return)
Step 10: Create Normal Order #5          → PENDING (Bot #1 picks it up)
Step 11: Add Bot #3                      → IDLE (no pending orders)
Step 12: Remove Bot #3 mid-idle          → destroyed
Step 13: Wait 10s                        → Bot #1 completes Normal #5
Step 14: Print final status              → All orders COMPLETE, 1 bot remaining
```

Every log line outputs with `[HH:MM:SS]` timestamp prefix. The simulation properly awaits completion — no orphaned timers.

---

## Testing Strategy

All tests in `test.js` using `node:test` (`describe`/`it` blocks) + `node:assert`:

| Test Group | What It Covers |
|------------|---------------|
| Order | Creation with correct defaults, type assignment, toString format |
| OrderQueue | FIFO for same type, VIP-before-Normal insertion, dequeue order, empty queue handling, re-enqueue preserves priority |
| Bot | Creation defaults, startProcessing changes status, stopProcessing returns order + clears timer, injectable processing time |
| OrderController | Add normal order → pending, Add VIP → correct position, Add bot → processes immediately, Remove newest bot, Remove bot mid-processing → order returns to queue, Bot goes IDLE when queue empty, Full end-to-end scenario |

**Key testing improvement over sample:** Processing time is injected (50ms in tests), so tests actually await real `setTimeout` completion instead of manually calling `completeProcessing()`. This tests the actual async flow, not a simulation of it.

---

## Shell Scripts

### `scripts/build.sh`
```bash
#!/bin/bash
echo "Building CLI application..."
if ! command -v node &> /dev/null; then
    echo "Node.js is required but not installed."
    exit 1
fi
echo "Build completed"
```

### `scripts/test.sh`
```bash
#!/bin/bash
echo "Running unit tests..."
node --test test.js
echo "Unit tests completed"
```

### `scripts/run.sh`
```bash
#!/bin/bash
echo "Running CLI application..."
node index.js > scripts/result.txt
echo "CLI application execution completed"
```

---

## Key Design Decisions for Interview Discussion

1. **Zero dependencies** — demonstrates fundamentals, no framework crutch
2. **CommonJS** — simpler than ESM for a small CLI tool, no config overhead
3. **Flat file layout** — matches project scale, no unnecessary directory nesting
4. **Injectable processing time** — 10s in production, 50ms in tests — tests the real async path, not a workaround
5. **Event-driven bot assignment** — two trigger points (new order, bot finishes), same `processNextOrder()` method
6. **Proper simulation completion** — `index.js` awaits all timers before exiting, no orphaned output

---

## Improvements Over Sample

| Area | Sample Issue | Our Fix |
|------|-------------|---------|
| Testability | Tests call `completeProcessing()` directly, skipping the timer path | Injectable `processingTime` — tests run the real async flow in 50ms |
| Simulation integrity | Prints "Demo completed!" while orders still processing | Await all pending timers before final status |
| Assignment timing | `setTimeout(100)` arbitrary delay in completion callback | Synchronous callback from bot to controller — no race conditions |
| File organization | 3 classes in 1 file (185 lines) | 1 class per file — easier to read, modify, and track |
| Test framework | Custom `TestRunner` class reinventing assertions | `node:test` built-in — standard, zero deps, structured output |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Timer-based tests flaky in CI | Injectable processing time (50ms), no hardcoded waits |
| `result.txt` timestamp format mismatch | Dedicated `timestamp.js` with its own test case |
| Bot removal mid-processing edge case | Explicit test: remove bot → order returns to correct queue position |
| `node --test` not available on older Node | CI uses Node.js 22 — `node:test` is stable since Node 18 |

---

## Acceptance Criteria

- [ ] `scripts/test.sh` runs and all tests pass (exit code 0)
- [ ] `scripts/build.sh` runs without errors
- [ ] `scripts/run.sh` produces `scripts/result.txt` with valid content
- [ ] `result.txt` contains `HH:MM:SS` timestamps on every log line
- [ ] `result.txt` demonstrates: order creation, VIP priority, bot assignment, 10s processing, completion, idle state, bot removal
- [ ] Zero external dependencies
- [ ] All 7 requirements from the README are demonstrably met
- [ ] Code is clean and interview-ready
- [ ] Simulation completes fully — no orphaned timers or premature exit
