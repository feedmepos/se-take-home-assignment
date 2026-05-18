# McDonald's Order Management System - Frontend

A modern, responsive web application for managing McDonald's orders with automated bot processing. Built with Next.js 16, React 19, TypeScript, and Tailwind CSS.

## Overview

This system simulates a McDonald's order management workflow where:
- **Orders** can be created as NORMAL or VIP types
- **Bots** automatically process orders with priority given to VIP orders
- Orders move through states: PENDING → PROCESSING → COMPLETE
- Real-time updates show the status of orders and bots

## Features

### Order Management
- **Two Order Types**: 
  - NORMAL orders (standard priority)
  - VIP orders (high priority - processed first)
- **Order States**:
  - `PENDING`: Waiting to be processed
  - `PROCESSING`: Currently being handled by a bot
  - `COMPLETE`: Successfully processed
- **FIFO with VIP Priority**: VIP orders jump to the front of the queue while maintaining FIFO within each order type

### Bot System
- **Dynamic Bot Management**: Add or remove cooking bots in real-time
- **Automatic Order Assignment**: Idle bots automatically pick up pending orders
- **Processing Time**: Each order takes exactly 10 seconds to process
- **Smart Bot Removal**: When removing a bot, any in-progress order is returned to the pending queue

### Real-time Interface
- **Live Status Updates**: See order and bot status changes in real-time
- **Visual Indicators**: Color-coded orders and bots for easy status identification
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Technology Stack

- **Framework**: Next.js 16 with App Router
- **UI Library**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **State Management**: React Hooks (custom useOrderManager hook)

## Project Structure

```
mcd-fe/
├── app/
│   ├── page.tsx              # Main application page
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/
│   ├── Bot.tsx               # Individual bot display
│   ├── BotController.tsx     # Bot management interface
│   ├── Order.tsx             # Individual order display
│   ├── OrderControls.tsx     # Order creation controls
│   └── OrderQueue.tsx        # Order queue display
├── hooks/
│   └── useOrderManager.ts    # Core order management logic
├── types/
│   └── order.ts              # TypeScript type definitions
└── package.json              # Dependencies and scripts
```

## Core Components

### useOrderManager Hook
The heart of the application containing all business logic:
- Order creation and state management
- Bot lifecycle management
- Automatic order assignment algorithm
- Processing timer management
- VIP priority queue implementation

### Order Flow
1. **Creation**: Orders created via OrderControls component
2. **Queuing**: Orders enter pending queue with VIP priority
3. **Assignment**: Idle bots automatically pick up orders
4. **Processing**: 10-second processing timer starts
5. **Completion**: Orders move to completed queue, bots return to idle

### Bot Behavior
- **Idle State**: Waiting for available orders
- **Processing State**: Actively handling an order
- **Automatic Assignment**: Bots immediately pick up orders when available
- **Graceful Removal**: Removing bots preserves in-progress orders

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd mcd-fe

# Install dependencies
npm install
# or
yarn install
# or
pnpm install
```

### Development
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Build for Production
```bash
npm run build
npm start
```

### Linting
```bash
npm run lint
```

## Usage Instructions

1. **Add Bots**: Click the "+ Bot" button to add cooking bots
2. **Create Orders**: Use "New Normal Order" or "New VIP Order" buttons
3. **Monitor Progress**: Watch as bots automatically process orders
4. **Manage Resources**: Add/remove bots as needed to optimize throughput

## Key Algorithms

### VIP Priority Queue
Orders are sorted with the following logic:
```typescript
// VIP orders come first, but maintain FIFO within same type
if (a.type === 'VIP' && b.type !== 'VIP') return -1;
if (a.type !== 'VIP' && b.type === 'VIP') return 1;
return a.id - b.id; // FIFO within same type
```

### Order Assignment
- Idle bots are matched with pending orders
- Maximum concurrent processing = number of available bots
- Assignment happens automatically when orders or bots change

## Performance Considerations

- **Efficient State Updates**: Uses React's useCallback for optimal re-rendering
- **Timer Management**: Proper cleanup of processing timers prevents memory leaks
- **Responsive Scrolling**: Order queues handle large numbers efficiently

## Future Enhancements

- Order customization (food items, quantities)
- Bot performance metrics
- Order history and analytics
- WebSocket integration for real-time updates
- Order cancellation functionality

---

This frontend demonstrates modern React development patterns, efficient state management, and clean component architecture while providing an intuitive user experience for order management.
