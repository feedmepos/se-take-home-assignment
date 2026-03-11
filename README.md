# FeedMe — McDonald's Order Controller (Node.js CLI)

A CLI simulation of McDonald's automated cooking bot order management system.

---

## Prerequisites

Before running the project, ensure the following are installed:

- **Node.js ≥ 18**
- **npm** (comes with Node.js)
- **Git**

Verify installation:

```bash
node -v
npm -v
```

Perform installation:
```bash
npm i
```

## Architecture

```
src/
├── OrderController.js   # Core domain logic (queue management, bot lifecycle)
├── Logger.js            # Timestamped logger — writes to console + result.txt
├── index.js             # CLI entry point — runs 4 demo scenarios
└── tests.js             # Unit tests (Node built-ins, no extra deps)
scripts/
├── build.sh             # Syntax-check all source files
├── test.sh              # Run unit tests
└── run.sh               # Execute CLI, output → result.txt
```

## Quick Start

```bash
# Test the system in fast mode (1 second per order)
ORDER_PROCESS_MS=1000 bash scripts/run.sh

# View output
cat scripts/result.txt
```

## Running locally

```bash
# Build (syntax check)
bash scripts/build.sh

# Test
bash scripts/test.sh

# Run full demo (10 s per order — real time)
bash scripts/run.sh

# Run in fast mode (500 ms per order)
ORDER_PROCESS_MS=500 bash scripts/run.sh
```

## Design Decisions

### Queue ordering
- VIP orders are inserted after the last existing VIP order and before the first Normal order.
- This preserves FIFO within each tier while keeping VIPs always ahead of Normals.

### Bot removal
- Bots are identified by a monotonically increasing ID; "newest" means highest ID.
- On removal the bot's `setTimeout` is cleared immediately, preventing a ghost completion.
- If the bot was processing an order, the order is re-inserted using the same priority logic.

### No external dependencies
- Pure Node.js; uses only `fs`, `path`, `assert`, and `setTimeout`/`clearTimeout`.
- Tests use `node:assert` — no Jest, Mocha, or other test runners needed.

## Public API

### `addOrder(type)`
- **Parameters**: `type` — `"NORMAL"` or `"VIP"`
- **Returns**: Order object `{ id, type, status }`
- **Effect**: Adds order to queue, auto-assigns idle bots

### `addBot()`
- **Returns**: Bot ID (integer)
- **Effect**: Creates new bot, immediately tries to pick up pending order

### `removeBot()`
- **Returns**: Bot ID of removed bot, or `null` if no bots exist
- **Effect**: Removes newest (highest ID) bot; if processing an order, returns it to PENDING

### `getSnapshot()`
- **Returns**: Snapshot object with `{ pending, bots, complete }`
  - `pending`: array of pending orders
  - `bots`: array of bot statuses
  - `complete`: array of completed orders with timestamps

## Order Object

```javascript
{
  id: 1,           // Unique, monotonically increasing
  type: "NORMAL",  // or "VIP"
  status: "PENDING" // or "COMPLETE"
}
```

## Scenarios demonstrated

| Scenario | What it tests |
|---|---|
| 1 | Normal orders + 1 bot, sequential processing |
| 2 | VIP priority — VIPs processed before Normals |
| 3 | Parallel bots — two bots work simultaneously |
| 4 | Bot removal mid-process — order returns to PENDING |

## Output Format

### result.txt

All output is logged to `scripts/result.txt` in this format:

```
[HH:MM:SS] [INFO ] <message>
[HH:MM:SS] [WARN ] <message>
```

Timestamps use 24-hour `HH:MM:SS` format.

### Snapshot Output

After each operation, the system prints the current state:
- **PENDING**: Orders waiting to be processed
- **BOTS**: Bot status (IDLE or WORKING with assigned order)
- **COMPLETE**: Finished orders with completion timestamps

### Order Notation

- `#1(N)` = Order #1 (Normal)
- `#2(V)` = Order #2 (VIP)
- `#1(N) @22:01:33` = Order completed at 22:01:33

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `ORDER_PROCESS_MS` | `10000` | Time (ms) each bot takes to process one order |
| `OUTPUT_FILE` | `scripts/result.txt` | Path to output log file |

## Troubleshooting

**Q: Tests fail or syntax errors**
- Run: `bash scripts/build.sh` to check for syntax issues

**Q: Output file not created**
- Ensure `scripts/` directory exists and is writable

**Q: Bots not processing orders**
- Make sure at least one order is added before bots are created
- Bots only pick up orders after they're idle

**Q: Want to see the output in real-time**
- Run: `tail -f scripts/result.txt` in another terminal while running the demo
