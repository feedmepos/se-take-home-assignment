# McDonald's Order Controller

A frontend prototype for an automated order management system with cooking bots.

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4 + shadcn/ui
- Playwright (e2e tests)

## Getting Started

```bash
bun install
bun run dev
```

Open http://localhost:5173

## How It Works

- **New Normal Order** — adds order to the pending queue
- **New VIP Order** — adds order to pending, prioritized ahead of all normal orders but behind existing VIP orders
- **+ Bot** — creates a cooking bot that immediately picks up the next pending order and processes it in 10 seconds
- **- Bot** — removes the newest bot. If it was processing an order, that order returns to its correct position in the pending queue

### Order Priority

Orders maintain their position by type (VIP before Normal) and by creation order (lower ID first) within each group. When a bot is removed mid-processing, its order is re-inserted at the correct position — not appended to the end.

### Bot Behavior

- Each bot processes one order at a time (10 seconds per order)
- Idle bots automatically pick up new orders as they arrive
- When a bot completes an order, it immediately picks up the next pending order if available
- Bots are always removed newest-first (LIFO)
- Bot IDs are reused when bots are removed and re-added

## Running Tests

```bash
bun run test:e2e
```

24 e2e tests covering:
- Order creation and priority queue ordering
- Bot processing, idle state, and auto-pickup
- Bot removal with order return and redistribution
- VIP/Normal priority edge cases
- Rapid add/remove stress testing
- Load test with 50 orders and 5 bots

Tests use `?processTime=500` query param to speed up the 10s processing timer.

## Project Structure

```
src/
├── app/App.tsx                          # App entry
├── features/orders/
│   ├── types/index.ts                   # Order, Bot, State, Action types
│   ├── hooks/useOrderController.ts      # Reducer + timer logic
│   ├── components/
│   │   ├── OrderController.tsx          # Root layout
│   │   ├── OrderButtons.tsx             # New Normal / VIP Order buttons
│   │   ├── BotControls.tsx              # + Bot / - Bot controls + bot list
│   │   └── OrderArea.tsx                # Pending / Complete order lists
│   └── index.ts                         # Barrel export
├── components/ui/                       # shadcn/ui primitives
└── lib/utils.ts                         # cn() utility
```

## Deployment

Configured for Netlify via `netlify.toml` in the repo root. Connects to GitHub for auto-deploy on push.
