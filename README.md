# WcDonald's Kitchen - Order Management Demo

A Vue 3 demo application simulating WcDonald's kitchen order management with cooking bots.

## Live URL:

[shabil-ai-feedme-se-take-home.vercel.app](https://shabil-ai-feedme-se-take-home-assignment.vercel.app/)

## Features

- **Order Management**: Create Normal and VIP orders
- **Priority Queue**: VIP orders are processed before normal orders
- **Bot Management**: Add/remove cooking bots dynamically
- **Real-time Processing**: Watch orders flow from PENDING to COMPLETE
- **Responsive Design**: Works on desktop and mobile devices

## User Stories Implemented

1. **Normal Customer**: Orders appear in "PENDING" area and flow to "COMPLETE" after processing
2. **VIP Member**: Orders are prioritized ahead of normal orders, but queue behind existing VIP orders
3. **Manager**: Can increase/decrease number of cooking bots
4. **Bot Behavior**:
   - Processes 1 order at a time
   - Takes 10 seconds per order
   - Returns to IDLE when no orders pending
   - If removed while processing, order returns to PENDING

## Tech Stack

- **Vue 3** - Composition API with `<script setup>`
- **Pinia** - State Management
- **TailwindCSS 4** - Styling
- **Vite** - Build tool
- **TypeScript** - Type safety

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

The dev server runs on `http://localhost:2906`

## How It Works

### Order Queue

- Click **"New Normal Order"** to add a regular order to the end of the queue
- Click **"New VIP Order"** to add a priority order (inserted after existing VIP orders)
- Order numbers are unique and incrementing

### Bot System

- Click **"+ Bot"** to add a cooking bot
- Click **"- Bot"** to remove the most recently added bot
- Each bot takes 10 seconds to complete an order
- If a bot is removed while processing, the order returns to PENDING
- Idle bots automatically pick up new orders

### Order Flow

```
[New Order] → [PENDING Queue] → [Bot Processing] → [COMPLETE]
```

## Project Structure

```
src/
├── App.vue              # Root component
├── main.ts              # App entry point
├── style.css            # Global styles & Tailwind config
├── router/
│   └── router.ts        # Vue Router setup
├── stores/
│   └── orderStore.ts    # Pinia store for order/bot state
└── views/
    └── OrderBoard.vue   # Main dashboard view
```

## License

MIT
