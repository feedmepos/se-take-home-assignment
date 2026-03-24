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
| `new normal` | Create a normal order |
| `new vip` | Create a VIP order (queued before all normal orders) |
| `add bot` | Add a cooking bot (immediately picks up a pending order) |
| `remove bot` | Remove the newest bot (returns its order to the queue) |
| `status` | Print current queue and bot state |
| `exit` | Quit the CLI |

Example session:

```
> new normal
14:30:01 - Order 143001ABC (NORMAL) created [PENDING]
> new vip
14:30:02 - Order 143002XYZ (VIP) created [PENDING]
> add bot
14:30:03 - Bot Bot-143003QRP created [IDLE]
14:30:03 - Bot Bot-143003QRP picked up order 143002XYZ [PROCESSING]
> status
14:30:03 - --- STATUS: pending=1 complete=0 bots=1 ---
14:30:03 -   PENDING  [NORMAL] 143001ABC
14:30:03 -   BOT Bot-143003QRP [PROCESSING]
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
