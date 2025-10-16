# McDonald Bot – Order Controller (CLI)

A Node.js TypeScript CLI that simulates McDonald’s automated cooking bots during COVID-19, implementing VIP-first queueing, dynamic bot scaling, and timestamped logging.

## Features

- Unique, increasing order IDs
- VIP-first queueing (VIPs ahead of normals; VIP FIFO among VIPs)
- Bots process 1 order at a time, ~10 seconds per order
- Dynamic scaling: `+bot` adds a bot; `-bot` removes newest bot and returns its order to PENDING
- Bots become IDLE when no pending orders
- Timestamps in HH:MM:SS for all logs
- In-memory; no persistence

## Architecture

- app (composition/CLI)
  - `src/index.ts` – bootstrap, readline loop
  - `src/cli/commands/*` – command parsing and dispatch
  - `src/constants/commands.ts` – `Constants` for all command tokens/help
  - `src/config/index.ts` – common config
- domain
  - `src/entities/*.type.ts` – `Order`, `CompletedOrder`, `ControllerState`
  - `src/entities/order-priority.enum.ts`
  - `src/helpers/pending-queue.ts` – VIP-first pending queue
  - `src/bot/bot.service.ts` – per-bot processing
  - `src/bot/bot.controller.ts` – orchestrates orders/bots; logs via injected logger
- infrastructure
  - `src/helpers/logger.ts` – console logger (pipe stdout to file when needed)
- tests (colocated)
  - `src/helpers/pending-queue.test.ts`
  - `src/bot/bot.service.test.ts`
  - `src/bot/bot.controller.test.ts`
  - `src/utils/time.test.ts`

## Requirements mapping

- VIP-first queue: `PendingQueue`
- IDs: `BotController` increments on creation
- `+bot`/`-bot`: immediate processing; removal returns current order
- Single-order processing: `BotService` currentOrder gate
- Idle: `getState()` exposes busy/active
- Timestamps: console logger with HH:MM:SS

## Install

```bash
npm ci
```

## Build

```bash
npm run build
```

## Run (interactive)

```bash
node dist/index.js
# normal order
# vip order
# +bot
# state
# quit
```

## Run and capture output

```bash
npm run build && npm start
```

## Scripts

- `scripts/build.sh` – build in CI
- `scripts/run.sh` – stress scenario piped to stdin (non-interactive/CI)
- `scripts/test.sh` – run Jest

## CLI commands

- `normal order` – enqueue a normal order
- `vip order` – enqueue a VIP order
- `+bot` – add a bot
- `-bot` – remove newest bot (returns its current order)
- `state` – print current state
- `help` – show commands
- `quit`/`exit` – final state and exit

## Tests

```bash
npm test -- --runInBand
```

Covers:

- VIP-first priority and VIP FIFO
- Bot lifecycle and stop behavior
- No overlap with single bot
- Controller add/remove orchestration
- Time formatting (HH:MM:SS)

## Notes

- CI is non-interactive; use `scripts/run.sh` or pipe commands.
- Default processing time 10s; tests use faster durations.
- All state is in memory.
