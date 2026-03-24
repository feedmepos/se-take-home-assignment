# McDonald's Order Queue System — Node.js Backend Plan

## Context

Build a Node.js application for a McDonald's-style order queue system. It has two runtime modes:

1. **CLI mode** — an interactive terminal application that accepts typed commands, logs all events with HH:MM:SS timestamps, and writes output to `result.txt`. This is the primary deliverable and must run in GitHub Actions.
2. **REST + WebSocket server** — Express + Socket.io backend for a frontend UI (secondary).

All state is in-memory. The project must follow GitHub Flow (feature branch → PR → checks pass).

---

## Tech Stack

- **Runtime:** Node.js 24
- **CLI:** Node.js built-in `readline` (interactive mode) + `fs` (write result.txt)
- **HTTP server:** Express.js
- **Real-time:** Socket.io
- **Tests:** Node.js built-in test runner (`node:test`) — no extra dependency
- **No DB:** all state held in JS memory

---

## Data Models (in-memory)

### Order
```js
{
  systemId: String,    // UUID v4 — internal reference (never exposed to UI)
  displayId: String,   // "HHMMSS" + 3 random uppercase chars, e.g. "143022XKP" — shown to user
  type: 'NORMAL' | 'VIP',
  status: 'PENDING' | 'COMPLETE',
  createdAt: Date,
  completedAt: Date | null,
  processingBotId: String | null  // UUID of the bot currently handling this order
}
```

### Bot
```js
{
  systemId: String,    // UUID v4
  displayId: String,   // "Bot-HHMMSS" + 3 random chars for human-readable label
  status: 'IDLE' | 'PROCESSING',
  currentOrderId: String | null,  // systemId of the order being processed
  timer: NodeJS.Timeout | null
}
```

### Global State
```js
{
  orders: Order[],     // all orders (pending + complete); pending are ordered by priority
  bots: Bot[]
}
```

### ID Generation helpers (`src/utils/idHelper.js`)
```js
// systemId: crypto.randomUUID()
// displayId: HHMMSS + 3 random uppercase letters
function generateDisplayId() {
  const now = new Date();
  const time = now.toTimeString().slice(0, 8).replace(/:/g, ''); // "143022"
  const rand = Array.from({ length: 3 }, () =>
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]
  ).join('');
  return time + rand; // e.g. "143022XKP"
}
```

---

## Queue Priority Rules

**PENDING queue ordering** (maintained at all times):
1. VIP orders appear before all NORMAL orders
2. Within the same type, orders are ordered by `createdAt` ascending (FIFO)

**On new VIP order:** insert after the last VIP order (before first NORMAL)
**On new NORMAL order:** append to end

**On bot destruction (order return):** re-insert the returned order at the correct position based on its type and `createdAt` — it slots back in as if it were newly queued with its original timestamp.

---

## API Endpoints

All routes defined in `src/routes.js`.

### Orders
| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/api/orders` | `{ type: 'NORMAL'\|'VIP' }` | Create new order |
| GET | `/api/orders` | — | Returns `{ pending: [], complete: [] }` |

### Bots
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/bots` | Add a bot (immediately picks up pending order if any) |
| DELETE | `/api/bots` | Remove the newest bot; if processing, return order to queue |

---

## WebSocket Events (Socket.io)

Emit to all clients on any state change:

| Event | Payload | Trigger |
|-------|---------|---------|
| `state:update` | `{ pending: [], complete: [], bots: [] }` | Any order or bot change |

Single unified event keeps the client simple — it just re-renders from full state.

---

## Project Structure

```
/
├── package.json
├── result.txt                        # Auto-generated CLI output (gitignored)
├── .github/workflows/ci.yml          # GitHub Actions: build → test → run
├── scripts/
│   ├── build.sh                      # npm install
│   ├── test.sh                       # Run unit tests via node:test
│   └── run.sh                        # Run CLI, output to result.txt
├── src/
│   ├── index.js                      # Entry point — starts CLI or HTTP server
│   ├── cli.js                        # Interactive CLI (readline REPL loop)
│   ├── logger.js                     # Timestamped logger: stdout + append result.txt
│   ├── state.js                      # In-memory state singleton
│   ├── routes.js                     # All HTTP route definitions
│   ├── controllers/
│   │   ├── orderController.js
│   │   └── botController.js
│   ├── services/
│   │   ├── orderService.js           # Queue insertion + priority logic
│   │   └── botService.js             # Bot lifecycle, timers
│   └── utils/
│       └── idHelper.js               # generateSystemId(), generateDisplayId()
└── tests/
    ├── orderService.test.js
    └── botService.test.js
```

---

## Key Logic Details

### `orderService.insertPending(order)`
Finds the correct index in the pending queue:
- VIP: insert at index = (count of existing VIP pending orders)
- NORMAL: push to end of pending list

### `botService.assignNextOrder(bot)`
- Finds first PENDING order
- Marks order `status = 'PROCESSING'` (internal) and sets `order.processingBotId = bot.systemId`
- Sets `bot.status = 'PROCESSING'`, `bot.currentOrderId = order.systemId`
- Starts a 10-second `setTimeout`; on completion:
  - Sets `order.status = 'COMPLETE'`, `order.completedAt = new Date()`
  - Clears `bot.currentOrderId`, calls `assignNextOrder(bot)` again (chain)
- If no pending orders: bot becomes IDLE

### `botService.removeNewestBot()`
- Finds bot with the most recently created `systemId` (last in bots array)
- Clears its timer if running
- If `bot.currentOrderId` is set, retrieves that order by `systemId`, resets it to PENDING (`processingBotId = null`, `completedAt = null`), re-inserts via `orderService.insertPending`
- Removes bot from state

### Bot auto-assignment on new order
When a new order is created, check for any IDLE bot and assign it immediately.

---

---

## CLI Interface (`src/cli.js`)

Interactive commands (readline prompt `> `):

| Command | Action |
|---------|--------|
| `new normal` | Create a NORMAL order |
| `new vip` | Create a VIP order |
| `add bot` | Add a cooking bot |
| `remove bot` | Remove the newest bot |
| `status` | Print current pending/complete/bot state |
| `exit` | Quit the CLI |

All events are logged via `logger.js` with `HH:MM:SS` prefix and appended to `result.txt`:
```
14:30:22 - Order 143022XKP (VIP) created [PENDING]
14:30:22 - Bot 143022QRP created [IDLE]
14:30:22 - Bot 143022QRP picked up order 143022XKP [PROCESSING]
14:30:32 - Order 143022XKP completed [COMPLETE]
14:30:32 - Bot 143022QRP is now [IDLE]
```

For GitHub Actions (non-interactive), `run.sh` pipes a predefined command script into the CLI via stdin.

---

## Scripts (`scripts/`)

### `build.sh`
```bash
#!/bin/bash
set -e
node --version
npm install
echo "Build complete."
```

### `test.sh`
```bash
#!/bin/bash
set -e
node --test tests/**/*.test.js
```

### `run.sh`
```bash
#!/bin/bash
set -e
# Pipe commands for non-interactive (CI) demo run
echo -e "new normal\nnew vip\nadd bot\nnew normal\nadd bot\nremove bot\nstatus\nexit" \
  | node src/index.js --cli
cat result.txt
```

---

## GitHub Actions (`.github/workflows/ci.yml`)

```yaml
name: CI
on: [push, pull_request]
jobs:
  build-test-run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - run: bash scripts/build.sh
      - run: bash scripts/test.sh
      - run: bash scripts/run.sh
      - uses: actions/upload-artifact@v4
        with:
          name: result
          path: result.txt
```

---

## Dependencies

```json
{
  "express": "^4.18",
  "socket.io": "^4.7",
  "cors": "^2.8"
}
```

- `node:test`, `crypto`, `readline`, `fs` — all built-in to Node 24, no extra packages needed for CLI/tests.
- No TypeScript — plain JS prototype.

---

## Verification

1. `bash scripts/build.sh` → dependencies installed
2. `bash scripts/test.sh` → all unit tests pass
3. `bash scripts/run.sh` → CLI runs with demo commands, `result.txt` created with timestamps
4. Interactive: `node src/index.js --cli` → type commands manually
5. HTTP server: `node src/index.js --server` → REST + Socket.io on port 3000
6. GitHub Actions CI runs all three scripts on push/PR and uploads `result.txt` as artifact
