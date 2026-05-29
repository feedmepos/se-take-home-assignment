# Design

## Architecture
The implementation uses npm workspaces and four packages:

- `packages/core`: shared order controller domain logic, event stream, metrics, and time abstraction.
- `packages/cli`: scripted demo and interactive shell backed by the core package.
- `packages/api`: Fastify HTTP API and SSE endpoint backed by the core package.
- `packages/web`: React/Vite unified console that consumes the API and SSE stream.

## Domain model
- Orders have an increasing numeric id, priority (`normal` or `vip`), status (`pending`, `processing`, `complete`), timestamps, and current bot assignment.
- Bots have an increasing numeric id, status (`idle` or `processing`), current order id, lifecycle timestamps, and completion counters.
- The controller keeps one pending queue ordered as "all VIP orders in arrival order, then all normal orders in arrival order".
- Removing the latest bot cancels any in-flight timer, returns the order to the pending queue using the same queueing rules, and emits an event.

## Time simulation
- The core accepts a scheduler abstraction with `now()`, `schedule(delayMs, callback)`, and `clear(handle)`.
- Runtime entrypoints use the real scheduler.
- Tests and scripted demos use a fake scheduler to advance time without waiting for real 10-second delays.

## Interfaces
- Core commands: `createNormalOrder`, `createVipOrder`, `addBot`, `removeLatestBot`, `getSnapshot`, `subscribe`, `getEvents`.
- API routes: `GET /health`, `GET /state`, `POST /orders`, `POST /bots`, `DELETE /bots/latest`, `GET /events`.
- CLI commands: `normal`, `vip`, `bot:add`, `bot:remove`, `status`, `events`, `help`, `exit`.

## Frontend
- Single-page unified console with explicit "Customer Actions" and "Manager Actions".
- Data flow: initial `GET /state`, then live updates from `GET /events` via SSE.
- UI shows stats, bot cards, pending/processing/complete columns, details drawer, timeline, and connection feedback.
