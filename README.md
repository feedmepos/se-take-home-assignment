# McDonald's Order Controller — FeedMe SE Take-Home Assignment

A Node.js CLI application that simulates an automated order management system for McDonald's cooking bots.

## Requirements Implemented

| # | Requirement | Status |
|---|-------------|--------|
| 1 | New Normal Order appears in PENDING | ✅ |
| 2 | New VIP Order inserts before normals, behind existing VIPs | ✅ |
| 3 | Order numbers are unique and increasing | ✅ |
| 4 | `+ Bot` creates a bot that processes orders (10 s each) | ✅ |
| 5 | Bot becomes IDLE when PENDING queue is empty | ✅ |
| 6 | `- Bot` destroys the newest bot; in-progress order returns to PENDING | ✅ |
| 7 | No data persistence required | ✅ |

## Project Structure

```
├── src/
│   ├── OrderController.js   # Core domain logic (Order, Bot, OrderController)
│   └── cli.js               # CLI simulation runner → result.txt
├── __tests__/
│   └── OrderController.test.js  # Jest unit tests
├── scripts/
│   ├── build.sh             # Syntax / dependency check
│   ├── test.sh              # Run unit tests
│   └── run.sh               # Run simulation (--fast mode for CI)
└── package.json
```

## Quick Start

```bash
npm ci

# Run full simulation (10 s per order)
npm start

# Run fast simulation (1 s per order, used in CI)
npm run start:fast

# Run unit tests
npm test
```

## Design Decisions

- **No external dependencies** for the core logic — only Node.js built-ins (`setTimeout`/`clearTimeout`).
- **`OrderController`** is a plain class, making it easy to unit-test without mocking a framework.
- **VIP priority** is enforced at insertion time: a VIP order is always placed after the last existing VIP, keeping the relative order of same-type orders stable (FIFO within each tier).
- **Bot removal** clears the timer immediately and resets the order status to `PENDING`; the returned order preserves its type-based queue position.
- **`--fast` flag** scales processing time from 10 s → 1 s so GitHub Actions finishes quickly while still demonstrating timing-based behaviour.

## Output Format

`result.txt` timestamps use `HH:MM:SS` format:

```
[14:32:01] === McDonald's Order Controller Simulation (FAST mode) ===
[14:32:01] BOT ADDED     → Bot#1 created
[14:32:01] ORDER ADDED   → #1 [NORMAL]
[14:32:01] ORDER PICKUP  → Bot#1 picked up Order#1 [NORMAL]
...
[14:32:06] ORDER DONE    → Order#5 is COMPLETE
[14:32:06] === Simulation Complete ===
```
