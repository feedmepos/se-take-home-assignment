## Implementation — Node.js Backend

### Prerequisites

- Node.js 22
- npm

### Setup

```bash
npm install
```

### Running

**Interactive CLI** — type commands manually:

```bash
npm run cli
```

**HTTP + WebSocket server** — for frontend integration:

```bash
npm run server
# Server starts on http://localhost:3000
```

**CI demo run** — pipes a preset command sequence and writes output to `scripts/result.txt`:

```bash
bash scripts/run.sh
```

### CLI Commands

| Command | Action |
|---------|--------|
| `+order` | Create a normal order |
| `+vip` | Create a VIP order (queued before all normal orders) |
| `+bot` | Add a cooking bot (immediately picks up a pending order) |
| `-bot` | Remove the newest bot (returns its order to the queue) |
| `status` | Print current queue and bot state |
| `exit` | Quit the CLI |

Example session:

```
> +order
14:30:01 - Order 100 (NORMAL) created [PENDING]
> +vip
14:30:02 - Order 101 (VIP) created [PENDING]
> +bot
14:30:03 - Bot Bot-102 created [IDLE]
14:30:03 - Bot Bot-102 picked up order 101 [PROCESSING]
> status
14:30:03 - --- STATUS: pending=1 complete=0 bots=1 ---
14:30:03 -   PENDING  [NORMAL] 100
14:30:03 -   BOT Bot-102 [PROCESSING]
```

### Testing

```bash
bash scripts/test.sh
```

Runs all unit tests via the Node.js built-in test runner. No extra dependencies needed.

### REST API (server mode)

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `POST` | `/api/orders` | `{ "type": "NORMAL" \| "VIP" }` | Create an order |
| `GET` | `/api/orders` | — | Get `{ pending, complete }` |
| `POST` | `/api/bots` | — | Add a bot |
| `DELETE` | `/api/bots` | — | Remove the newest bot |

WebSocket event `state:update` is emitted to all connected clients on every state change, with payload `{ pending, complete, bots }`.

### Project Structure

```
src/
├── index.js              # Entry point (--cli or --server)
├── cli.js                # Interactive CLI
├── logger.js             # Timestamped logger → stdout + scripts/result.txt
├── state.js              # In-memory state + getStateSnapshot()
├── routes.js             # Express route definitions
├── controllers/
│   ├── orderController.js
│   └── botController.js
├── services/
│   ├── orderService.js   # Queue insertion and priority logic
│   └── botService.js     # Bot lifecycle and 10s processing timers
└── utils/
    └── idHelper.js       # ID generation helpers
tests/
├── orderService.test.js
└── botService.test.js
scripts/
├── build.sh              # npm install
├── test.sh               # Run unit tests
└── run.sh                # Run CLI demo, output to scripts/result.txt
```
