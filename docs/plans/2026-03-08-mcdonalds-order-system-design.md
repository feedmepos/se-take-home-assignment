# McDonald's Order Management System — Design

## Overview

Full-stack McDonald's automated order management system with a Go backend and SvelteKit frontend. The Go backend serves dual purposes: a CLI entrypoint for CI validation and an API server that serves both REST/WebSocket endpoints and the static SvelteKit frontend.

## Architecture

```
backend/
├── cmd/
│   ├── cli/main.go          # CI entrypoint — scripted simulation → result.txt
│   └── server/main.go       # API server — REST + WebSocket + static frontend
├── internal/
│   ├── core/
│   │   ├── order.go          # Order type, priority queue
│   │   └── bot.go            # Bot lifecycle, processing
│   ├── engine/
│   │   └── engine.go         # OrderEngine — orchestrates orders + bots
│   └── api/
│       ├── handler.go        # REST handlers
│       └── websocket.go      # WebSocket hub for real-time updates
└── go.mod

frontend/
├── src/
│   ├── routes/+page.svelte   # Main UI
│   └── lib/
│       ├── stores/           # Svelte stores for state
│       ├── components/       # OrderCard, BotPanel, PendingArea, CompleteArea
│       └── websocket.ts      # WS client
├── svelte.config.js          # adapter-static
└── package.json
```

Both `cmd/cli` and `cmd/server` import `internal/engine`. The server embeds built frontend static files via Go's `embed` package.

## Domain Model

- **Order** — ID (auto-increment), Type (VIP/Normal), Status (PENDING/PROCESSING/COMPLETE), timestamps
- **Bot** — ID (auto-increment), Status (IDLE/PROCESSING), current order reference
- **OrderEngine** — holds priority queue, bot pool, orchestration logic

### Priority Queue

Internally a slice. VIP orders insert after last VIP but before normal orders. Normal orders append at end. Dequeue from front.

## API

### REST

- `POST /api/orders` — `{"type": "vip"|"normal"}` → creates order, triggers idle bot pickup
- `POST /api/bots` — adds bot, immediately picks up pending order if available
- `DELETE /api/bots` — removes newest bot, returns its order to PENDING if processing
- `GET /api/state` — full current state

### WebSocket

- `GET /ws` — events: `order_created`, `order_processing`, `order_completed`, `bot_created`, `bot_destroyed`, `bot_idle`, `state_sync`

## Frontend

### Components

- **Header** — title, McDonald's branding
- **Controls** — New Normal Order, New VIP Order, + Bot, - Bot buttons
- **PendingArea** — OrderCards with PENDING/PROCESSING status
- **CompleteArea** — completed OrderCards
- **BotPanel** — active bots, status, current order
- **OrderCard** — order #, type badge, status, bot assignment

### State Management

Single Svelte writable store. WebSocket updates the store. REST calls fire actions; UI reacts to server-pushed state.

### Styling

Tailwind CSS with McDonald's palette: red (#DA291C), yellow (#FFC72C). VIP orders get gold border/badge. Processing orders show pulse animation.

## CI Pipeline

- `test.sh` — `cd backend && go test ./... -v`
- `build.sh` — build Go CLI + build SvelteKit + copy static assets
- `run.sh` — `./backend/order-controller > scripts/result.txt`

CLI runs a scripted simulation with timestamped output in `HH:MM:SS` format.

## Deployment

Single Go binary with embedded frontend. Deploy to Fly.io via multi-stage Dockerfile (build Go + build SvelteKit → minimal runtime image).
