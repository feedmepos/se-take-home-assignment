# McDonald's Order Controller

Submission for the FeedMe POS Senior Software Engineer take-home assessment.

This repository implements the order controller in both requested forms:

- **Backend / CLI**: Node.js + NestJS + TypeScript, executable by the provided GitHub Actions workflow.
- **Frontend / UI**: React + TypeScript + Vite, backed by the same in-memory order controller through REST + Server-Sent Events.

The business state is intentionally in memory only. No database is required for this prototype.

## Requirements covered

| Requirement | Implementation |
| --- | --- |
| Normal order enters `PENDING` | `POST /api/orders`, CLI `add-order --type normal`, UI `New Normal Order` |
| VIP order queues ahead of normal orders | Shared domain comparator: VIP first, FIFO by id within each tier |
| Unique increasing order numbers | Monotonic order ids starting at `1001` |
| `+ Bot` starts work immediately | `addBot()` creates an idle bot and immediately assigns the highest-priority pending order |
| Each bot cooks one order for 10 seconds | Real scheduler in runtime, fake clock in unit tests |
| Idle bots wait for the next order | Assignment runs after every order/bot change |
| `- Bot` destroys newest bot | CLI `del-bot`, UI `- Bot`, API `DELETE /api/bots` |
| Destroying a processing bot requeues its order | Timer is cancelled, order returns to `PENDING`, priority ordering is preserved |

## Quick start

From the repository root, these are the backend assessment scripts expected by the
provided GitHub Actions workflow:

```bash
bash scripts/test.sh
bash scripts/build.sh
bash scripts/run.sh
```

`scripts/run.sh` writes the CLI scenario output to:

```text
scripts/result.txt
```

The committed `scripts/result.example.txt` shows the expected output shape. A fresh `result.txt` is generated on every run and includes `HH:MM:SS` timestamps for the order/bot events.

## Backend CLI

The backend lives in `backend/`.

```bash
cd backend
npm install
npm run build
node dist/cli/scenario.js
```

Interactive CLI for the interview round:

```bash
cd backend
npm run build
node dist/cli/interactive.js
```

Available commands:

```text
add-order [--type normal|vip]
add-bot
del-bot
del-bot --id N
list-orders [--type normal|vip]
list-bots
status
help
exit
```

The `--id` delete path is a small extension for API/UI debugging. The required `del-bot` behavior still removes the newest bot.

## Frontend UI

The frontend lives in `frontend/`.

For local development, run the backend API and Vite separately:

```bash
cd backend
npm install
npm start
```

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL, usually:

```text
http://localhost:5173
```

For production-style local serving:

```bash
cd frontend
npm install
npm run build

cd ../backend
npm install
npm run build
cd ..

cd backend
npm run start:prod
```

Then open:

```text
http://localhost:3000
```

The NestJS app serves the built React app from `frontend/dist` and exposes the API under `/api`.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/orders` | Create an order, body `{ "type": "NORMAL" }` or `{ "type": "VIP" }` |
| `GET` | `/api/orders?type=VIP` | List orders, optionally filtered |
| `POST` | `/api/bots` | Add a bot |
| `GET` | `/api/bots` | List bots |
| `DELETE` | `/api/bots` | Remove the newest bot |
| `DELETE` | `/api/bots/:id` | Remove a specific bot |
| `GET` | `/api/status` | Full state snapshot |
| `GET` | `/api/events` | SSE stream of full state snapshots |
| `GET` | `/api/health` | Health check |

## Testing

Backend contract scripts:

```bash
bash scripts/test.sh
bash scripts/build.sh
bash scripts/run.sh
node scripts/stress-check.js
```

Frontend CI is covered separately by `.github/workflows/frontend-verify.yml`
(`npm ci`, lint, tests, and build).

Backend checks:

```bash
cd backend
npm run typecheck
npm test
npm run test:e2e
```

Frontend checks:

```bash
cd frontend
npm run lint
npm test
npm run build
```

Additional stress coverage:

```bash
node scripts/stress-check.js
```

The stress script covers high-throughput draining, requeue under load, microtask-level command bursts, and an API concurrency smoke test.

## Documentation

- Backend details: `backend/README.md`
- Frontend details: `frontend/README.md`
- Architecture notes: `docs/architecture.md`
- Stress/concurrency notes: `docs/stress-and-concurrency-testing.md`
- Decision records: `docs/adr/`

## Design notes

The core order controller is framework-free TypeScript under `backend/src/domain/`. CLI, REST/SSE, and React all use the same domain behavior, so the UI is not a separate simulation.

The frontend keeps no business state. It sends REST commands, listens to `GET /api/events`, and replaces its view with each full server snapshot. This avoids duplicated queueing, timing, or bot-assignment logic in the browser.
