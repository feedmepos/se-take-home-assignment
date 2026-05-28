# Order Controller — Backend

McDonald's automated cooking-bot order controller. All business logic lives in a
framework-free TypeScript **domain core** (`src/domain/`); thin adapters wrap it:

| Adapter | Entry | Purpose |
| --- | --- | --- |
| **CLI scenario runner** | `src/cli/scenario.ts` | Runs a scripted, real-time demo and logs each event to stdout (→ `scripts/result.txt`). The CI artifact. |
| **Interactive REPL** | `src/cli/interactive.ts` | Same command dispatcher reading from stdin — drive the controller by hand. |
| **REST + SSE API** | `src/api/` (`src/main.ts`) | HTTP control surface + a live event stream for the React UI. |

State is in memory only — no database (the spec allows this). Design rationale lives in
[`../docs/architecture.md`](../docs/architecture.md), the domain glossary in
[`../CONTEXT.md`](../CONTEXT.md), and decisions in [`../docs/adr/`](../docs/adr/).

## Setup

```bash
npm install
```

## CI scripts (run from the repo root)

```bash
bash scripts/test.sh    # npm ci && npm test && npm run test:e2e   (unit + e2e)
bash scripts/build.sh   # npm ci && npm run build
bash scripts/run.sh     # node dist/cli/scenario.js > scripts/result.txt
```

## npm scripts

```bash
npm run build      # nest build  -> dist/ (emits dist/main.js AND dist/cli/scenario.js)
npm test           # unit tests (Jest, fake clock — runs in ms)
npm run test:e2e   # API e2e tests (supertest)
npm start          # start the REST/SSE API on :3000
```

## CLI

### Scenario runner (the `result.txt` generator)

```bash
npm run build && node dist/cli/scenario.js > ../scripts/result.txt
```

Runs the **real** controller in real time (real `setTimeout`, real 10s cooks).
Narration goes to stderr; stdout is a pure event log with wall-clock `HH:MM:SS`
timestamps. The scripted run demonstrates, in order: VIP priority, FIFO within a
tier, bot pickup, the 10s cook, destroying the **newest idle** bot like the
employer sample, then an extra destroy-while-processing segment proving requeue.
See the sample below.

### Interactive REPL

```bash
npm run build && node dist/cli/interactive.js
# or without building:
npx ts-node src/cli/interactive.ts
```

### Command reference (shared by both)

| Command | Effect |
| --- | --- |
| `add-order [--type normal\|vip]` | Create an order (default `normal`). VIP queues ahead of all normals. |
| `add-bot` | Add a cooking bot; it immediately picks up the highest-priority pending order. |
| `del-bot` | Destroy the **newest** bot. If it was cooking, its order returns to PENDING. |
| `del-bot --id N` | _Extension:_ destroy a **specific** bot by id (same requeue behavior; mirrors `DELETE /bots/:id`). Not used by the demo scenario. |
| `list-orders [--type normal\|vip]` | Print orders as JSON, optionally filtered by type. |
| `list-bots` | Print bots as JSON. |
| `status` | Print the full state snapshot as JSON. |
| `help` | Show usage. |
| `exit` | Leave the REPL (interactive only). |

## REST + SSE API

API is served under the `/api` prefix (the SPA build is served on all other routes).

| Method & path | Description |
| --- | --- |
| `POST /api/orders` | Create an order. Body: `{ "type": "NORMAL" \| "VIP" }`. |
| `GET /api/orders[?type=]` | List orders, optionally filtered by type. |
| `POST /api/bots` | Add a bot. |
| `DELETE /api/bots` | Destroy the newest bot. |
| `DELETE /api/bots/:id` | _Extension:_ destroy a specific bot (404 if not found). |
| `GET /api/status` | Full state snapshot. |
| `GET /api/events` | **SSE** — pushes the full status snapshot on connect and on every change. |
| `GET /api/health` | Liveness check. |

## Expected `scripts/result.txt`

`scripts/result.txt` is generated (git-ignored). The committed
[`../scripts/result.example.txt`](../scripts/result.example.txt) is the
**employer-provided** sample that defines the expected output format; our output
matches that format. A run of our scenario looks like:

```
McDonald's Order Management System - Simulation Results

[..] System initialized with 0 bots
[..] Created Normal Order #1 - Status: PENDING
[..] Created VIP Order #2 - Status: PENDING
[..] Created Normal Order #3 - Status: PENDING
[..] Bot #1 created - Status: ACTIVE
[..] Bot #1 picked up VIP Order #2 - Status: PROCESSING        # VIP jumps ahead of #1
[..] Bot #2 created - Status: ACTIVE
[..] Bot #2 picked up Normal Order #1 - Status: PROCESSING
[..] Bot #1 completed VIP Order #2 - Status: COMPLETE (Processing time: 10s)
[..] Bot #1 picked up Normal Order #3 - Status: PROCESSING
[..] Bot #2 completed Normal Order #1 - Status: COMPLETE (Processing time: 10s)
[..] Bot #2 is now IDLE - No pending orders
[..] Created VIP Order #4 - Status: PENDING
[..] Bot #2 picked up VIP Order #4 - Status: PROCESSING
[..] Bot #1 completed Normal Order #3 - Status: COMPLETE (Processing time: 10s)
[..] Bot #1 is now IDLE - No pending orders
[..] Bot #2 completed VIP Order #4 - Status: COMPLETE (Processing time: 10s)
[..] Bot #2 is now IDLE - No pending orders
[..] Bot #2 destroyed while IDLE
[..] Created Normal Order #5 - Status: PENDING
[..] Bot #1 picked up Normal Order #5 - Status: PROCESSING
[..] Normal Order #5 returned to PENDING - Status: PENDING     # del-bot (no id): newest bot, mid-cook
[..] Bot #1 destroyed while PROCESSING
[..] Bot #3 created - Status: ACTIVE
[..] Bot #3 picked up Normal Order #5 - Status: PROCESSING
[..] Bot #3 completed Normal Order #5 - Status: COMPLETE (Processing time: 10s)
[..] Bot #3 is now IDLE - No pending orders

Final Status:
- Total Orders Processed: 5 (2 VIP, 3 Normal)
- Orders Completed: 5
- Active Bots: 1
- Pending Orders: 0
```

The first part stays close to the employer's sample, including destroying an idle
bot. The final extra order destroys the newest bot **mid-cook** so the requeue
requirement is visibly proven.

## Additional stress checks

Optional stress and concurrency checks are documented in
[`../docs/stress-and-concurrency-testing.md`](../docs/stress-and-concurrency-testing.md).
Run them after a build with:

```bash
node scripts/stress-check.js
```

## Behavior summary

- **Order types** — `NORMAL` and `VIP`. The PENDING area is ordered by one comparator:
  *VIP before NORMAL, ties by ascending id.* This yields FIFO within a tier and makes
  requeue land in the original slot for free.
- **Bots** — each processes one order at a time; a fixed **10s** cook, measured via an
  injected clock/scheduler (real `setTimeout` in production, a fake clock in tests).
- **`del-bot`** — destroys the newest bot; if it was cooking, the order reverts to
  PENDING (no partial progress) and is re-cooked from scratch on next pickup.
- **Zero bots** is a valid state: pending orders wait, nothing is dropped. Ids are never
  reused.
