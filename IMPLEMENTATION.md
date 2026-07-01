# Implementation — McDonald's Order Controller (Node.js backend)

A CLI prototype of the automated cooking-bot order controller, written in plain
Node.js JavaScript. All state is kept in memory (no persistence, as allowed by
the assignment). No third-party dependencies.

## Requirements coverage

| Requirement | Where |
|---|---|
| New Normal order → PENDING | `newNormalOrder()` |
| New VIP order → in front of Normals, behind earlier VIPs | `newVipOrder()` + `_enqueue` / `_comesAfter` |
| Unique, increasing order numbers | `nextOrderId` counter |
| `+Bot` immediately processes a pending order; completes after 10s; then takes the next | `addBot` → `_dispatch` → `_assign` → `_completeOrder` |
| Bot becomes IDLE when no pending orders | `_completeOrder` |
| `-Bot` destroys the **newest** bot; in-progress order returns to its original queue position | `removeBot` (pops newest, `clearTimeout`, `_enqueue`) |
| In-memory only | plain arrays, no I/O |

The pending queue is always kept in priority order — **VIP before Normal, and
within a type the lower (older) order id first**. Because both new orders and
orders returned by a destroyed bot go through the same `_enqueue`, a preempted
order automatically lands back in its correct position.

## Project layout

```
src/
  order.js            Order model + OrderType/OrderStatus enums
  bot.js              Bot model + BotStatus enum
  orderController.js  Core in-memory controller (priority queue + bot scheduling)
  format.js           HH:MM:SS timestamp helper
index.js              Interactive CLI (real 10s timers)
scenario.js           Scripted demo → result.txt (real 10s timers)
test/                 node:test unit tests (fast, fake scheduler)
scripts/              test.sh / build.sh / run.sh / result.txt (CI entrypoints)
```

Timers, the clock, and the 10s duration are **injected** into `OrderController`,
so the same logic runs with real timers in the CLI/scenario and with a fake
scheduler in the tests — the suite needs no real waiting.

## Running it

```bash
# Interactive CLI (compulsory demo for the next round)
npm start
#   commands: normal | vip | +bot | -bot | status | help | exit

# Scripted scenario → prints to scripts/result.txt (~27s, real 10s cooks)
./scripts/run.sh

# Unit tests (instant, fake timers)
./scripts/test.sh        # or: npm test
```

## Script mapping (matches `backend-verify-result` workflow)

| Script | Command | Notes |
|---|---|---|
| `test.sh` | `npm test` → `node --test` | 10 unit tests, no real waiting |
| `build.sh` | `npm install` | JS is interpreted — no compile step; no runtime deps |
| `run.sh` | `node scenario.js \| tee scripts/result.txt` | genuine `HH:MM:SS` timestamps |

The workflow then asserts `scripts/result.txt` exists, is non-empty, and
contains `HH:MM:SS` timestamps.

## Notes / decisions

- **Plain Node.js JavaScript**, CommonJS — runs on any Node version with no
  build tooling or flags.
- **Real 10s timers in the scenario** so `result.txt` timestamps are truthful
  (the run takes ~27s). Tests use a fake scheduler to stay instant.
- Interactive CLI (`index.js`) and the automated run (`scenario.js`) are kept
  separate: the interactive CLI blocks on keyboard input and cannot produce
  `result.txt` unattended in CI, so `scenario.js` drives a fixed demo instead.
