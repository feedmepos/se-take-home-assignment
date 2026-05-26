# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

McDonald's order management system — a full-stack prototype controlling automated cooking bots. Customers submit orders (Normal/VIP), bots process them (10s each), VIP orders always take priority. No persistence; all data in memory.

## Commands

```bash
pnpm dev              # start backend (port 3000) + frontend (port 5173) concurrently
pnpm test             # run all unit tests (backend Vitest + frontend Vitest)
pnpm test:e2e         # run Playwright e2e tests (requires both servers running)
pnpm -F <pkg> <cmd>   # target a single workspace package
```

Workspace packages: `mcdonalds-order-backend`, `frontend`.

## Architecture

```
Request/Page Load                    Real-time Updates
      │                                     │
      ▼                                     ▼
Express Routes (/api/*)            WebSocket (/ws)
      │                                     │
Application Services               OrderProcessingEvents
      │                                     │
OrderProcessingEngine ◄─────────────────────┘
(Domain — pure logic, no framework imports)
      │
  Order, Bot (domain models)
```

**Dependency direction:** server → infrastructure → application → domain. Domain layer imports nothing from Express, HTTP, or WS.

## Backend (DDD Layers)

- **domain/model** — `Order` (aggregate root), `Bot` (entity), `types` (OrderType/OrderStatus/BotStatus)
- **domain/service** — `OrderProcessingEngine`: createOrder, addBot, removeBot, getOrders, getBots, addListener
- **domain/event** — `OrderProcessingEvents`: EventEmitter for `order:completed` and `bot:status_changed`
- **application/service** — `OrderService`, `BotService` — thin wrappers converting domain objects to JSON
- **infrastructure/http** — Express routes at `/api/orders`, `/api/bots`
- **infrastructure/ws** — `WebSocketManager` attaches to HTTP server, listens to domain events, broadcasts

## WebSocket Events

Only two events are pushed:

| Event | Trigger | Payload |
|-------|---------|---------|
| `order:completed` | 10s processing done | `Order` (with `completedAt`) |
| `bot:status_changed` | bot starts/finishes processing | `{ botId, status, currentOrderId? }` |

Order creation and bot add/remove are NOT pushed — frontend refreshes via REST after those mutations.

## Frontend Data Flow

- **REST mutations**: `POST /api/orders` → invalidate `['orders']` query → refetch
- **WS events**: `orderEventClient.subscribe()` → `queryClient.setQueryData()` to update cache in-place
- `OrderEventClient` (singleton in `services/`) manages WebSocket connection and reconnection
- `useOrderEvents` hook only calls subscribe/unsubscribe within React lifecycle

Pages: `/orders` (PENDING + COMPLETE columns), `/bots` (bot list with controls). React Router with NavBar tab switching.

## Key Domain Rules

- VIP orders inserted after all existing VIPs, before all NORMAL orders
- `removeBot()` always removes the **newest** bot; if processing, the order returns to its original PENDING position
- Each bot processes exactly one order at a time (10s `setTimeout`)
- When a bot picks an order, it calls `order.startProcessing()` → status becomes PROCESSING, preventing double assignment
- Frontend PENDING column shows both PENDING and PROCESSING orders (`status !== 'COMPLETE'`) — only two visual states

## Testing

- Backend: `vitest run` — domain tests use `vi.useFakeTimers()` to control the 10s processing window
- Frontend: `vitest run` — component tests with React Testing Library + jsdom
- E2E: `playwright test` — webServer config in `playwright.config.ts` starts both servers
