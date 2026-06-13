# Backend — McDonald's Order Controller (Node.js)

In-memory order controller for McDonald's automated cooking bots. No database,
no third-party runtime dependencies — built entirely on the Node.js standard
library (`http`, `events`, `readline`, `node:test`).

## Requirements

- Node.js >= 18 (CI uses 22.19.0)

## Layout

```
src/
  orderController.js   Core domain engine (queue + bots + timers). Framework-agnostic.
  logger.js            HH:MM:SS timestamped logging helpers.
  cli.js               Interactive CLI (readline) — the compulsory interactive app.
  demo.js              Non-interactive scripted scenario -> produces result.txt.
  server.js            HTTP + SSE API consumed by the Vue frontend.
test/
  orderController.test.js   Unit tests (node:test) using a deterministic fake clock.
```

## How the engine satisfies the requirements

| Requirement | Implementation |
|---|---|
| New order → PENDING | `addOrder()` queues and emits `order:new`. |
| VIP ahead of NORMAL, behind earlier VIPs | PENDING is kept sorted by `(VIP<NORMAL, then increasing id)`. |
| Unique, increasing order numbers | Monotonic `_orderSeq` counter. |
| `+ Bot` processes a pending order immediately | `addBot()` → `_assignWork()` picks the front order; completes after `processMs` (10s). |
| Bot idle when queue empty | A bot with no work stays `IDLE`. |
| `- Bot` destroys newest bot; in-progress order returns to PENDING at correct priority | `removeBot()` pops the newest bot, clears its timer, re-enqueues its order (re-sorted by priority). |
| 10s per order | `processMs` default `10000` (configurable via `PROCESS_MS`). |
| In-memory only | Plain arrays; nothing persisted. |

Timers are injectable, so unit tests drive the engine with a fake clock and run
instantly.

## Commands

```bash
npm install        # no deps, but validates engines
npm test           # unit tests (11 cases)
npm run cli        # interactive CLI
npm run demo       # scripted scenario, prints timestamped log to stdout
npm run server     # HTTP/SSE API on http://localhost:3001 (for the frontend)
```

### Interactive CLI commands

`normal`|`n`, `vip`|`v`, `+bot`|`+`, `-bot`|`-`, `status`|`s`, `help`|`h`, `exit`

### Environment variables

- `PROCESS_MS` — ms to cook one order (default `10000`). E.g. `PROCESS_MS=500 npm run cli`.
- `PORT` — server port (default `3001`).

## CI scripts

The repository-root `scripts/{test,build,run}.sh` delegate here. `run.sh` runs
`src/demo.js` and writes the timestamped log to `scripts/result.txt`, which the
`backend-verify-result` GitHub Action validates (must exist, be non-empty, and
contain `HH:MM:SS` timestamps).

## HTTP API (used by the frontend)

| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/api/state` | — | Current `{ pending, complete, bots }` snapshot. |
| GET | `/api/events` | — | SSE stream; pushes the snapshot on every change. |
| POST | `/api/orders` | `{ "type": "NORMAL" \| "VIP" }` | Add an order. |
| POST | `/api/bots` | — | Add a bot. |
| DELETE | `/api/bots` | — | Remove the newest bot. |
