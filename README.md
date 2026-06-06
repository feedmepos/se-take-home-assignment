# McDonald's Order Management System

A CLI simulation of a food order processing system with VIP priority queuing and concurrent bot processing.

## Requirements

- **Node.js** v18 or higher (developed on v22)
- **npm** v9 or higher (developed on v10)

## Installation

```bash
npm install
```

## Build

Compile TypeScript to JavaScript:

```bash
npm run build
```

Output is written to the `dist/` directory.

## Running

### Interactive CLI

Run the compiled build:

```bash
npm start
```

Or run directly with ts-node (no build needed):

```bash
npm run dev
```

### Demo Mode

Runs a scripted sequence to demonstrate the system end-to-end:

```bash
npm run demo
```

Results are written to `scripts/result.txt`.

### Configuration

| Environment variable | Default | Description                        |
|----------------------|---------|------------------------------------|
| `PROCESSING_TIME_MS` | `10000` | Time (ms) each bot takes per order |

Example — run with 3-second processing time:

```bash
PROCESSING_TIME_MS=3000 npm run dev
```

## CLI Menu Options

```
=== McDonald's Order Management ===
1. Add Bot
2. Remove Bot
3. Add Normal Order
4. Add VIP Order
5. Check Bot Status
6. Show Order List
7. Exit
```

| Option          | Description |
|-----------------|-------------|
| Add Bot         | Spawns a new processing bot. The bot immediately picks up a pending order if one exists. |
| Remove Bot      | Removes the most recently added bot (LIFO). Any in-progress order is returned to the queue as `PENDING`. |
| Add Normal Order | Creates a normal-priority order and queues it. An idle bot will pick it up immediately. |
| Add VIP Order   | Creates a VIP order. VIP orders are always processed before normal orders. |
| Check Bot Status | Shows each bot's current state — which order it is processing and how many seconds remain, or `IDLE`. |
| Show Order List | Lists all orders currently waiting in the queue, showing each order's ID and type (VIP or Normal). |
| Exit            | Stops all bots, returns in-progress orders to the queue, and writes a final summary to `scripts/result.txt`. |

## What to Expect

- **VIP priority** — VIP orders always jump ahead of normal orders in the queue regardless of arrival order.
- **FIFO within same type** — among orders of the same type, first-in is first-out.
- **Bot chaining** — when a bot finishes an order it immediately picks up the next one in the queue without intervention.
- **Safe removal** — removing a bot never drops an order; in-progress work is re-queued.
- **Persistent log** — every event (order created, bot started/stopped, order completed) is timestamped and appended to `scripts/result.txt`.

## Tests

```bash
npm test
```

Covers queue priority, FIFO ordering, bot lifecycle, order completion timing, VIP precedence, and bot removal behaviour (16 tests).
