# McDonald's Order Management System

**FeedMe Software Engineer Take-Home — Backend (Node.js CLI) solution.**

A zero-dependency Node.js CLI that simulates McDonald's automated cooking bots processing
customer orders with VIP priority handling. It ships in two modes: a **scripted simulation**
(used by CI, writes `scripts/result.txt`) and an **interactive CLI** (live keyboard-driven demo).

> The original assignment brief is preserved at the [bottom of this file](#original-assignment-brief).

---

## Quick Start

### Prerequisites
- **Node.js 20 or newer** (tested on Node 20 and 22) — that's it.
- **Zero dependencies.** There is nothing to `npm install`.

### Run it

```bash
# 1. Scripted simulation — prints the run to the console AND writes scripts/result.txt
npm start

# 2. Interactive CLI — live demo, control bots/orders with single keypresses
npm run interactive

# 3. Run the tests
npm test              # unit tests
npm run test:scenario # requirement-based scenario tests (R1–R7)
```

### Run the full CI pipeline locally

This is exactly what the `backend-verify-result` GitHub Actions workflow runs:

```bash
./scripts/build.sh && ./scripts/test.sh && ./scripts/run.sh
```

- `build.sh` — verifies Node.js is available
- `test.sh` — runs the unit tests
- `run.sh` — runs the simulation and writes the output (with `HH:MM:SS` timestamps) to `scripts/result.txt`

After running, view the generated output:

```bash
cat scripts/result.txt
```

---

## What you'll see

`npm start` plays a deterministic scenario that exercises all 7 requirements and prints a
timestamped event log — orders created, VIP-priority queue, bots picking up / completing
orders in 10s, bots going idle, and bot removal — ending with a summary box:

```
[2026-07-02 22:03:33]
✓ ⭐ VIP Order #2 created

[2026-07-02 22:03:33]
📋 Queue: ⭐#2 → #1 → #3        ← VIP jumps ahead of normal orders

[2026-07-02 22:03:44]
✓ Bot #1 completed ⭐ VIP Order #2 (10s)
🤖 Bot #1 → picked up Normal Order #3 (waited 10s)
...
📊 FINAL SUMMARY — 5 orders (2 VIP, 3 Normal), 5 completed, 0 pending
```

---

## Requirement Coverage

| # | Requirement | Where it lives |
|---|-------------|----------------|
| R1 | Normal order → PENDING | `src/order-queue.js` (`enqueue`) |
| R2 | VIP before Normal, behind existing VIPs | `src/order-queue.js` (priority insert) |
| R3 | Unique, increasing order IDs | `src/order-controller.js` |
| R4 | Bot processes one order in 10s | `src/bot.js` (injectable timer) |
| R5 | Bot goes IDLE when queue empty | `src/order-controller.js` |
| R6 | Remove newest bot, re-queue its order | `src/order-controller.js` (`removeBot`) |
| R7 | No persistence — all in memory | entire `src/` (no I/O) |

All 7 requirements are covered by automated tests: **38 unit tests + 31 scenario tests, all passing.**

---

## Project Structure

```
se-take-home-assignment/
├── index.js              # Scripted simulation (npm start) → scripts/result.txt
├── interactive.js        # Interactive CLI (npm run interactive)
├── package.json          # Zero deps, npm scripts
├── src/                  # Core logic
│   ├── order.js          # Order model
│   ├── bot.js            # Cooking bot (timer-driven)
│   ├── order-queue.js    # Priority queue (VIP > Normal, FIFO within)
│   ├── order-controller.js  # Orchestrator (queue + bots + events)
│   ├── logger.js         # Output formatting
│   └── timestamp.js      # HH:MM:SS / date helpers
├── tests/                # Unit + scenario tests (node:test)
├── scripts/              # CI shell scripts (build/test/run) + result.txt
└── docs/                 # Requirements, technical design, CLI spec, proposal
```

## Documentation

| Doc | Purpose |
|-----|---------|
| `docs/REQUIREMENTS.md` | The 7 requirements with diagrams |
| `docs/TECHNICAL.md` | Architecture, module APIs, data flow |
| `docs/CLI-DESIGN.md` | CLI visual output specification |
| `docs/PROPOSAL.md` | Design decisions and trade-offs |
| `docs/WORKFLOW.md` | **Agent-automated testing workflow** (see below) |

## Automated Testing Workflow (AI Agents)

`docs/WORKFLOW.md` defines a multi-agent workflow used to **automate the testing and review**
of this project with AI coding agents. It is a development/QA aid — you do **not** need it to
run or evaluate the project; the commands in [Quick Start](#quick-start) are all a reviewer needs.

The workflow dispatches specialized agents in phases, each writing a dated proof-of-work log to
`agent-review/`:

- **Phase 2 — Test (parallel):** a Unit-Test verifier, a Simulation/`result.txt` verifier, an
  Interactive-CLI tester, and a Scenario-coverage tester each independently run their checks and
  confirm R1–R7 coverage.
- **Phase 3 — Review:** a Code-Quality reviewer audits the source against `docs/TECHNICAL.md`.

Each agent reads `AGENTS.md` for project context and records its steps, results, and verdict in
`agent-review/<role>-YYYY-MM-DD.md`, giving a traceable, repeatable QA trail every time the code
changes. See `docs/WORKFLOW.md` for the full dispatch instructions and report formats.

> Note: `agent-review/` logs are generated per session and are git-ignored.

---
---

## Original Assignment Brief

_The section below is the original take-home prompt, kept for reference._

### Situation
McDonald is transforming their business during COVID-19. They wish to build the automated cooking bots to reduce workforce and increase their efficiency. As one of the software engineer in the project. You task is to create an order controller which handle the order control flow.

### User Story
As below is part of the user story:
1. As McDonald's normal customer, after I submitted my order, I wish to see my order flow into "PENDING" area. After the cooking bot process my order, I want to see it flow into to "COMPLETE" area.
2. As McDonald's VIP member, after I submitted my order, I want my order being process first before all order by normal customer.  However if there's existing order from VIP member, my order should queue behind his/her order.
3. As McDonald's manager, I want to increase or decrease number of cooking bot available in my restaurant. When I increase a bot, it should immediately process any pending order. When I decrease a bot, the processing order should remain un-process.
4. As McDonald bot, it can only pickup and process 1 order at a time, each order required 10 seconds to complete process.

### Requirements
1. When "New Normal Order" clicked, a new order should show up "PENDING" Area.
2. When "New VIP Order" clicked, a new order should show up in "PENDING" Area. It should place in-front of all existing "Normal" order but behind of all existing "VIP" order.
3. The order number should be unique and increasing.
4. When "+ Bot" clicked, a bot should be created and start processing the order inside "PENDING" area. after 10 seconds picking up the order, the order should move to "COMPLETE" area. Then the bot should start processing another order if there is any left in "PENDING" area.
5. If there is no more order in the "PENDING" area, the bot should become IDLE until a new order come in.
6. When "- Bot" clicked, the newest bot should be destroyed. If the bot is processing an order, it should also stop the process. The order should return to its original position in the "PENDING" area (maintaining VIP/Normal order priority).
7. No data persistance is needed for this prototype, you may perform all the process inside memory.

### Tips on completing this task
- Testing, testing and testing. Make sure the prototype is functioning and meeting all the requirements.
- Utilize coding agent to complete the assignment scope your working hour within 1 hour, do not over engineer it. However, ensure you read and understand what your code doing and apply good engineering practice.
- Complete the implementation as clean as possible, clean code is a strong plus point, do not bring in all the fancy tech stuff.
</content>
</invoke>
