# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Install dependencies: `npm install` or `npm ci`
- Start the Vite dev server: `npm run dev`
- Build for production: `npm run build`
- Run the full test suite once: `npm run test`
- Run one test file: `npx vitest run src/App.test.tsx`
- Run one named test: `npx vitest run src/App.test.tsx -t "test name"`
- Preview the production build: `npm run preview`
- GitHub Actions-compatible wrappers: `./scripts/test.sh`, `./scripts/build.sh`, `./scripts/run.sh`

`./scripts/run.sh` rewrites `scripts/result.txt` with a timestamped frontend verification summary. Check the working tree before running it if `scripts/result.txt` has local changes.

## Architecture

This is a frontend-only implementation of the FeedMe McDonald's order controller assignment using Vite, React, and TypeScript. All application state lives in browser memory; refreshing the page resets the prototype.

The order-control rules are split into two layers:

- `src/domain/orderController.ts` contains pure state transitions and domain types. It owns order IDs, bot IDs, VIP-before-normal priority, FIFO ordering within each order type, bot assignment, completion, and returning an interrupted bot's order to `PENDING`.
- `src/hooks/useOrderController.ts` adapts the pure domain module to React. It uses a reducer for user actions, owns the 10-second processing timers, clears stale timers when bots are removed or reassigned, exposes countdown data, and derives activity-log messages from state changes.

`src/App.tsx` is the UI composition layer. It calls `useOrderController()`, renders controls and the `PENDING` / bot / `COMPLETE` board, and keeps display helpers local to the component file. Styling is centralized in `src/App.css`.

## Conventions

- When creating React components, you must use the `vercel-react-best-practices` skill to ensure components follow the recommended performance and best-practice patterns.

Tests are split by responsibility:

- `src/domain/orderController.test.ts` verifies pure order-controller behavior without React.
- `src/App.test.tsx` verifies user-visible flows with React Testing Library and fake timers, including 10-second bot completion, no-bot pending behavior, countdown UI, VIP priority, and bot removal.

The original assignment is preserved in `README.md`. The implemented path is the frontend option, while the `scripts/*.sh` wrappers exist so automated checks can still call test/build/run commands consistently.
