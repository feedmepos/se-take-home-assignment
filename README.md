# FeedMe Fullstack Order Controller

This repository contains a complete TypeScript + Node.js solution for the FeedMe take-home assignment. The implementation keeps one shared order controller core and reuses it across a CLI, a Fastify API, and a React/Vite unified console.

## What is included
- `packages/core`: shared domain logic, fake scheduler, metrics, and event stream
- `packages/cli`: scripted demo mode and interactive CLI mode
- `packages/api`: Fastify API with `GET /state`, `POST /orders`, `POST /bots`, `DELETE /bots/latest`, and `GET /events` SSE
- `packages/web`: React/Vite single-page console with explicit Customer Actions and Manager Actions
- `openspec/changes/add-fullstack-order-controller`: spec-first change artifacts for this implementation

## Key product choices
- One unified console instead of separate customer and manager apps
- Backend remains the source of truth; the frontend never reimplements queue rules
- VIP orders always stay behind existing VIP orders and ahead of all pending normal orders
- Removing the newest bot cancels its in-flight work and requeues the order
- Metrics stay lightweight and in-memory: queue counts, bot counts, VIP/normal mix, average processing time, utilization, and completion rate

## Local development
### Install
```bash
npm install
```

### Run tests
```bash
npm test
```

### Run type checks
```bash
npm run lint
```

### Build everything
```bash
npm run build
```

### Generate the CLI demo output
```bash
npm run demo
```

### Run the interactive CLI
```bash
npm run cli:interactive
```

### Start the API locally
```bash
npm run dev:api
```

### Start the web console locally
```bash
npm run dev:web
```

By default the web app connects to `http://localhost:3001`. Override that with `VITE_API_BASE_URL`.

## Repository scripts
- `scripts/test.sh`: installs dependencies when needed and runs `npm test`
- `scripts/build.sh`: installs dependencies when needed and runs the full build
- `scripts/run.sh`: generates `scripts/result.txt` from the scripted CLI demo

These scripts are the entrypoints used by the GitHub Actions verification workflow.

## CLI behavior
The CLI supports two modes:

- `demo`: deterministic scripted run for CI and `scripts/result.txt`
- `interactive`: manual commands for the interview demo

Interactive commands:
```text
normal
vip
bot:add
bot:remove
status
events
help
exit
```

## API contract
- `GET /health`
- `GET /state`
- `POST /orders` with `{ "priority": "normal" | "vip" }`
- `POST /bots`
- `DELETE /bots/latest`
- `GET /events` using Server-Sent Events

`GET /state` and SSE snapshots include:
- pending orders
- processing orders
- completed orders
- bot state
- server time
- lightweight metrics

## Frontend organization
The unified console is a single-page control surface with:
- top overview banner
- explicit `Customer Actions` section
- explicit `Manager Actions` section
- metrics grid
- `Bots`, `Pending`, `Processing`, and `Complete` columns
- details drawer for orders and bots
- event timeline
- connection status feedback

## Testing strategy
- Core unit tests verify queueing, dispatch, cancellation, and metrics
- API tests verify snapshot access and error handling
- Web tests verify the console layout, action wiring, and live SSE-driven updates

## Deployment notes
This repo is ready for:
- Vercel frontend deployment using `packages/web`
- Render API deployment using `npm run build` and `npm run start:api`

Environment variable for the web app:
```bash
VITE_API_BASE_URL=https://your-api-domain.example.com
```

## Design tradeoffs
- In-memory state only, matching the assignment
- SSE instead of WebSocket, because the UI only needs server-to-client streaming
- Shared domain core to keep CLI, API, and UI behavior consistent

## Verification summary
- `openspec validate add-fullstack-order-controller --strict`
- `npm test`
- `npm run lint`
- `npm run build`
- `./scripts/run.sh`
