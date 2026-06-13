# McDonald's Order Controller — Implementation

Solution for the FeedMe take-home assignment. The assignment asked for **either**
a frontend or a backend; this implements **both**, sharing one well-tested
in-memory domain engine.

```
codes/
  backend/    Node.js — engine, interactive CLI, demo (result.txt), HTTP/SSE API
  frontend/   Vue 3 + Ant Design Vue — live UI driven by the backend
```

## Architecture

```
                 ┌────────────────────────────┐
                 │   orderController.js        │   in-memory engine
                 │   (queue + bots + timers)   │   emits events
                 └───────────┬────────────────┘
          ┌──────────────────┼─────────────────────┐
          │                  │                     │
     cli.js (readline)   demo.js (scripted)    server.js (http + SSE)
     interactive REPL    -> result.txt              │  REST + live stream
                                                     │
                                              frontend (Vue + antdv)
```

The engine is framework-agnostic and the single source of truth for all the
business rules; the CLI, demo, and HTTP server are thin adapters around it. This
keeps the rules unit-tested in one place (`backend/test`, 11 cases, deterministic
fake clock — no real waiting).

## Quick start

```bash
# Backend API + Frontend UI (recommended demo)
cd backend && npm install && PROCESS_MS=3000 npm run server   # :3001
cd ../frontend && npm install && npm run dev                  # :5173

# Backend only — interactive CLI
cd backend && npm run cli

# Backend only — run the unit tests
cd backend && npm test
```

## Requirements coverage

All seven functional requirements from the root `README.md` are implemented and
unit-tested: unique increasing order numbers, VIP-ahead-of-normal queueing, bots
that cook one order at a time for 10s, immediate pickup on `+ Bot`, idle bots
when the queue is empty, and `- Bot` returning an in-progress order to its
correct PENDING position. See `backend/README.md` for the rule-by-rule table.

## CI

`scripts/{test,build,run}.sh` (repo root) drive the backend so the
`backend-verify-result` GitHub Action passes. `run.sh` produces
`scripts/result.txt` with `HH:MM:SS` timestamps tracking order completion.
