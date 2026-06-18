# Frontend Implementation Guide

This project implements the McDonald's Order Controller as a **React** single-page application (Vite + TypeScript).

## Quick Start

```bash
npm install
npm run dev      # local dev server at http://localhost:5173
npm run build    # production build to dist/
npm run preview  # preview production build locally
```

## Features Implemented

| Requirement | Implementation |
|---|---|
| New Normal Order | Adds order to **PENDING** at the end of the queue |
| New VIP Order | Inserts after all existing VIP orders, before all Normal orders |
| Unique order numbers | Monotonically increasing integer IDs starting at #1 |
| + Bot | Creates a bot; idle bots immediately pick the front PENDING order |
| 10-second processing | Each order takes 10 seconds before moving to **COMPLETE** |
| Bot idle state | Bots show **IDLE** when no PENDING orders remain |
| - Bot | Removes the newest bot; in-progress orders return to their PENDING slot |
| In-memory only | All state lives in React; no persistence |

## Architecture

```
src/
├── App.tsx                 # UI layout and controls
├── hooks/
│   └── useOrderSystem.ts   # Core order/bot state machine
└── types.ts                # Shared TypeScript types
```

### Queue Priority Logic

VIP orders are inserted after the last existing VIP order and before the first Normal order:

```
[VIP#1, VIP#2, Normal#3] + new VIP → [VIP#1, VIP#2, NEW_VIP, Normal#3]
[VIP#1, VIP#2, Normal#3] + new Normal → [VIP#1, VIP#2, Normal#3, NEW_NORMAL]
```

### Bot Behavior

- Each bot processes **one order at a time** for **10 seconds**.
- On completion, the order moves to **COMPLETE** and the bot picks the next PENDING order.
- When a bot is removed mid-process, its timer is cancelled and the order is re-inserted at its original PENDING index.

## Deployment

Build the static site and deploy `dist/` to any static host:

```bash
npm run build
```

Suggested platforms: [Vercel](https://vercel.com), [Netlify](https://netlify.com), [GitHub Pages](https://pages.github.com).

### Vercel (example)

```bash
npx vercel --prod
```

Set build command to `npm run build` and output directory to `dist`.

## Manual Test Checklist

1. Click **New Normal Order** — order appears in PENDING with increasing ID.
2. Click **New VIP Order** — VIP order appears before all Normal orders, after existing VIP orders.
3. Click **+ Bot** — bot starts processing; after ~10s order moves to COMPLETE.
4. Add multiple orders + one bot — orders complete sequentially.
5. Add multiple bots — multiple orders process in parallel.
6. Click **- Bot** while a bot is processing — order returns to PENDING; bot is removed.
7. Remove all bots — no processing occurs until a new bot is added.
