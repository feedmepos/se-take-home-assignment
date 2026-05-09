# Mekdi POS - Project Context

## Overview

Vue.js 3 frontend for a McDonald's order management system with automated cooking bots. Handles order flow from PENDING → PROCESSING → COMPLETE with VIP priority queuing.

## Quick Reference

### Commands
```bash
npm install     # Install dependencies
npm run dev     # Start dev server (Vite)
npm run build   # Production build
npm test        # Run Jest unit tests
```

### Project Structure

```
mekdi-frontend/
├── src/
│   ├── domains/order/          # Domain layer (DDD)
│   │   ├── entities/            # OrderEntity, BotEntity, OrderQueue
│   │   ├── services/            # OrderProcessingService
│   │   ├── stores/              # Pinia store
│   │   └── types/               # TypeScript interfaces/enums
│   ├── components/
│   │   ├── ui/                  # Button, Card, Badge
│   │   ├── order/               # OrderCard, OrderList
│   │   └── bot/                 # BotIndicator, BotPanel
│   ├── views/
│   │   └── OrderManagementView.vue
│   ├── lib/
│   │   └── utils.ts             # cn() helper for Tailwind
│   ├── router/
│   ├── assets/
│   └── main.ts
├── dist/                        # Build output
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── jest.config.js
└── vercel.json                  # Vercel deployment config
```

## Domain Model

### OrderEntity
- **Properties**: `id`, `type` (NORMAL/VIP), `status` (PENDING/PROCESSING/COMPLETE), `createdAt`
- **Methods**: `getPriority()`, `startProcessing()`, `complete()`, `returnToPending()`, `isPending()`, `isProcessing()`, `isComplete()`

### BotEntity
- **Properties**: `id`, `status` (IDLE/BUSY), `currentOrderId`, `processingTimeoutId`
- **Methods**: `isIdle()`, `isBusy()`, `startProcessing(orderId, timeoutId)`, `stopProcessing()`, `completeProcessing()`

### OrderQueue
- **Responsibility**: Manages priority queue (VIP before Normal, FIFO within same type)
- **Key Methods**: `createOrder(type)`, `getPendingOrders()`, `getNextPendingOrder()`, `returnOrderToPending(orderId)`, `completeOrder(orderId)`

### OrderProcessingService
- **Responsibility**: Orchestrates bots processing orders (10s per order)
- **Callbacks**: `onOrderComplete`, `onBotStatusChange`
- **Key Methods**: `createNormalOrder()`, `createVipOrder()`, `addBot()`, `removeBot()`

## State Management (Pinia)

**Store**: `useOrderStore`

**State**:
- `pendingOrders: OrderEntity[]`
- `completeOrders: OrderEntity[]`
- `bots: BotEntity[]`

**Getters**:
- `idleBotsCount: number`
- `busyBotsCount: number`

**Actions**:
- `createNormalOrder()` - Creates normal order, adds to pending
- `createVipOrder()` - Creates VIP order, inserts with priority
- `addBot()` - Adds bot, starts processing if pending orders exist
- `removeBot()` - Removes newest bot, returns processing order to pending

## UI Components

### OrderManagementView
- Header with logo and title
- BotPanel (add/remove bots, show bot status)
- Two columns: PENDING orders (left), COMPLETE orders (right)
- Action buttons: "New Normal Order", "New VIP Order"

### OrderCard
- Shows order number, type badge (VIP=amber, Normal=gray), status
- Processing orders have blue ring and pulse animation

### BotPanel
- Shows bot count (idle/busy)
- +/- buttons to add/remove bots
- BotIndicator for each bot showing status and current order

## Business Rules

1. **Order Priority**: VIP orders placed before Normal orders, but after existing VIP orders
2. **Processing Time**: Each order takes exactly 10 seconds
3. **Bot Behavior**:
   - Idle bots automatically pick up next pending order
   - Busy bots show spinner and current order number
   - Removing a bot returns its processing order to PENDING with priority maintained
4. **Order Numbers**: Auto-incrementing unique integers starting from 1

## Testing

**Framework**: Jest with ts-jest

**Test Files**:
- `src/domains/order/entities/__tests__/OrderEntity.test.ts`
- `src/domains/order/entities/__tests__/BotEntity.test.ts`
- `src/domains/order/entities/__tests__/OrderQueue.test.ts`

**Run Tests**: `npm test`

## Deployment

**Platform**: Vercel

**Configuration** (`vercel.json`):
- Build command: `npm run build`
- Output directory: `dist`
- SPA fallback: All routes → index.html

**Deploy**:
```bash
npx vercel
```

## Key Files for Debugging

- Domain logic: `src/domains/order/services/OrderProcessingService.ts`
- State updates: `src/domains/order/stores/orderStore.ts`
- Queue priority: `src/domains/order/entities/OrderQueue.ts`
- Bot lifecycle: `src/domains/order/entities/BotEntity.ts`
