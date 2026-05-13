# McDonald's Order Management System - Complete Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [File Structure](#file-structure)
4. [Technology Stack](#technology-stack)
5. [Implementation Details](#implementation-details)
6. [API Endpoints](#api-endpoints)
7. [Real-time Updates (SSE)](#real-time-updates-sse)
8. [Development Guide](#development-guide)
9. [Deployment Guide](#deployment-guide)
10. [Testing](#testing)

---

## Overview

McDonald's Order Management System is a full-stack web application that simulates an automated order processing system with cooking bots. The system demonstrates:

- **Real-time order management** with VIP priority handling
- **Automated bot-based order processing** with 10-second processing time per order
- **Server-Sent Events (SSE)** for real-time frontend updates
- **Rate limiting** for API protection
- **Comprehensive logging** with formatted output
- **Production-ready deployment** to Render with GitHub Actions CI/CD

### Key Features
- ✅ Create normal and VIP orders
- ✅ Manage cooking bots (create/remove)
- ✅ Real-time order status tracking (PENDING → PROCESSING → COMPLETE)
- ✅ VIP order prioritization
- ✅ System reset functionality
- ✅ Full-screen responsive UI
- ✅ Rate limiting and logging
- ✅ Automated testing and deployment

---

## System Architecture

### High-Level Overview
```
┌─────────────────────────────────────────────────────────────┐
│                    Client (React + TypeScript)              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Components: OrderSection, BotSection, ProcessingSection │
│  │ State: Redux (orders, bots)                          │   │
│  │ Real-time: SSE Hook (EventSource)                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/SSE
┌─────────────────────────────────────────────────────────────┐
│              Server (Node.js + Express + TypeScript)        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ OrderManager: Core business logic                    │   │
│  │ Routes: /api/orders, /api/bots, /api/state, /api/events │
│  │ Middleware: Rate limiting, CORS                      │   │
│  │ SSE Manager: Real-time broadcast to clients          │   │
│  │ Logger: Structured logging with file output          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

#### Order Creation Flow
```
User clicks "Create Order"
    ↓
API POST /api/orders
    ↓
OrderManager.createOrder()
    ↓
Order added to state
    ↓
notifyStateChange() → SSE broadcast
    ↓
processNextOrder() (if idle bot exists)
    ↓
Frontend receives SSE update → Redux dispatch → UI updates
```

#### Order Processing Flow
```
Bot picks up order (10s timer starts)
    ↓
Order status: PENDING → PROCESSING
    ↓
SSE broadcast to all clients
    ↓
After 10 seconds: completeOrder()
    ↓
Order status: PROCESSING → COMPLETE
    ↓
Bot status: PROCESSING → IDLE
    ↓
SSE broadcast to all clients
    ↓
processNextOrder() (pick up next pending order)
```

---

## File Structure

### Root Level
```
.
├── package.json                 # Root dependencies & scripts
├── render.yaml                  # Render deployment config
├── .renderignore                # Files to exclude from Render
├── .github/
│   └── workflows/
│       ├── deploy.yaml          # Main CI/CD pipeline
│       └── backend-verify-result.yaml  # PR verification
├── scripts/
│   ├── build.sh                 # Build script
│   ├── run.sh                   # Run script
│   ├── test.sh                  # Test script
│   └── result.txt               # Test output log
├── server/                      # Backend source
├── client/                      # Frontend source
└── Documentation files
    ├── README.md
    ├── DEPLOYMENT.md
    ├── RENDER_SETUP.md
    ├── SYSTEM_DOCUMENTATION.md  # This file
    └── SCRIPTS_GUIDE.md
```

### Server Structure (`server/`)
```
server/
├── index.ts                     # Main server entry point
├── orderManager.ts              # Core business logic
├── sse.ts                       # Server-Sent Events manager
├── types.ts                     # TypeScript type definitions
├── tsconfig.json                # TypeScript config
├── middleware/
│   ├── index.ts                 # Middleware exports
│   └── rateLimiter.ts           # Express rate limiting
├── routes/
│   ├── index.ts                 # Route exports
│   ├── orders.ts                # Order endpoints
│   ├── bots.ts                  # Bot endpoints
│   ├── state.ts                 # State endpoints
│   └── events.ts                # SSE endpoint
├── utils/
│   ├── index.ts                 # Utils exports
│   └── logger.ts                # Structured logging
└── tests/
    ├── run.cjs                  # Test runner (CommonJS)
    ├── index.ts                 # Test index
    ├── orderManager.test.ts      # OrderManager tests
    ├── rateLimiter.test.ts       # Rate limiter tests
    └── logger.test.ts            # Logger tests
```

### Client Structure (`client/`)
```
client/
├── package.json                 # Client dependencies
├── tsconfig.json                # TypeScript config
├── vite.config.ts               # Vite build config
├── index.html                   # HTML entry point
├── src/
│   ├── main.tsx                 # React entry point
│   ├── App.tsx                  # Main App component
│   ├── index.css                # Global styles
│   ├── api/
│   │   ├── index.ts             # API exports
│   │   ├── orderApi.ts          # Order API calls
│   │   ├── botApi.ts            # Bot API calls
│   │   └── stateApi.ts          # State API calls
│   ├── components/
│   │   ├── index.ts             # Component exports
│   │   ├── ControlPanel.tsx      # Control buttons
│   │   ├── StatsDashboard.tsx    # Stats display
│   │   ├── OrderSection.tsx      # Order list section
│   │   ├── BotSection.tsx        # Bot list section
│   │   ├── ProcessingSection.tsx # Processing + Bots
│   │   ├── OrderCard.tsx         # Individual order card
│   │   └── BotCard.tsx           # Individual bot card
│   ├── hooks/
│   │   ├── index.ts             # Hooks exports
│   │   └── useSSE.ts            # SSE connection hook
│   ├── store/
│   │   ├── store.ts             # Redux store config
│   │   ├── hooks.ts             # Redux hooks
│   │   └── slices/
│   │       ├── index.ts         # Slices exports
│   │       ├── orderSlice.ts    # Order reducer
│   │       └── botSlice.ts      # Bot reducer
│   └── types/
│       ├── index.ts             # Types exports
│       ├── order.ts             # Order types
│       ├── bot.ts               # Bot types
│       └── state.ts             # State types
└── dist/                        # Built output
```

---

## Technology Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js 4.18
- **Language**: TypeScript 5.1
- **Build**: TypeScript Compiler (tsc)
- **Testing**: Custom test runner (CommonJS)
- **Rate Limiting**: express-rate-limit 8.5
- **CORS**: cors 2.8

### Frontend
- **Framework**: React 18
- **Language**: TypeScript 5.1
- **Build Tool**: Vite 8.0
- **State Management**: Redux Toolkit
- **Styling**: Tailwind CSS 4
- **Real-time**: Server-Sent Events (native)

### DevOps
- **CI/CD**: GitHub Actions
- **Deployment**: Render
- **Version Control**: Git

---

## Implementation Details

### 1. OrderManager (Core Logic)

**Location**: `server/orderManager.ts`

**Responsibilities**:
- Manage order and bot state
- Handle order creation and processing
- Implement VIP priority queue
- Trigger state change callbacks for SSE

**Key Methods**:
```typescript
createOrder(type: OrderType): Order
createBot(): Bot
removeBot(): Bot | null
setStateChangeCallback(callback): void
getState(): { orders, bots }
clearAll(): void
```

**Processing Flow**:
1. Order created → added to state
2. `processNextOrder()` called
3. Idle bot found → picks up next pending order
4. 10-second timer starts
5. Timer completes → `completeOrder()` called
6. Order marked COMPLETE, bot marked IDLE
7. Next order processed automatically

### 2. SSE Manager (Real-time Updates)

**Location**: `server/sse.ts`

**Responsibilities**:
- Manage EventSource connections
- Broadcast state updates to all connected clients
- Handle client disconnections

**Key Methods**:
```typescript
addClient(res: Response): string
broadcast(state: StateUpdate): void
getClientCount(): number
closeAll(): void
```

**How it works**:
1. Client connects to `/api/events`
2. SSE manager adds client to set
3. Initial state sent to client
4. OrderManager calls `notifyStateChange()`
5. SSE manager broadcasts to all clients
6. Frontend receives update via EventSource
7. Redux store updated
8. UI re-renders

### 3. Rate Limiting

**Location**: `server/middleware/rateLimiter.ts`

**Configuration**:
- **General API**: 100 req/15min
- **Orders**: 30 req/min
- **Bots**: 20 req/min
- **State**: 200 req/min
- **SSE**: No limit

**Returns**: 429 status with RateLimit headers when exceeded

### 4. Logging System

**Location**: `server/utils/logger.ts`

**Features**:
- Structured logging with timestamps (HH:MM:SS format)
- Console output with appropriate log levels
- File output to `scripts/result.txt`
- Domain-specific logging methods
- Graceful shutdown with log persistence

**Log Methods**:
```typescript
info(message, data?)
error(message, data?)
warn(message, data?)
success(message, data?)
logOrderCreated(orderId, type)
logOrderCompleted(orderId, processingTime)
logBotCreated(botId)
logBotRemoved(botId, status)
logBotPickedUpOrder(botId, orderId, orderType)
logBotIdle(botId)
logSystemInitialized(botCount)
logSystemReset()
logRateLimitExceeded(ip, endpoint)
saveToFile()
```

### 5. Redux State Management

**Location**: `client/src/store/`

**Slices**:
- **orderSlice**: Manages orders array
- **botSlice**: Manages bots array

**Actions**:
```typescript
// Orders
setOrders(orders)
clearOrders()

// Bots
setBots(bots)
clearBots()
```

### 6. Frontend Components

**App.tsx**: Main layout with full-screen grid
- Header (fixed)
- Control Panel (fixed)
- Stats Dashboard (fixed)
- Main content grid (3 columns, full height):
  - Pending Orders (OrderSection)
  - Processing & Bots (ProcessingSection)
  - Completed Orders (OrderSection)

**Component Hierarchy**:
```
App
├── Header
├── ControlPanel
├── StatsDashboard
└── Main Grid
    ├── OrderSection (Pending)
    ├── ProcessingSection
    │   ├── Processing Orders
    │   └── BotSection
    └── OrderSection (Complete)
```

---

## API Endpoints

### Orders
```
POST   /api/orders/normal      Create normal order
POST   /api/orders/vip         Create VIP order
GET    /api/orders             Get all orders
```

### Bots
```
POST   /api/bots               Create bot
DELETE /api/bots               Remove bot
GET    /api/bots               Get all bots
```

### State
```
GET    /api/state              Get current state
POST   /api/state/reset        Reset system
```

### Real-time
```
GET    /api/events             SSE connection (EventSource)
```

### Health
```
GET    /health                 Health check
```

---

## Real-time Updates (SSE)

### How SSE Works

1. **Connection Establishment**
   ```javascript
   const eventSource = new EventSource('/api/events');
   ```

2. **Message Handling**
   ```javascript
   eventSource.onmessage = (event) => {
     const message = JSON.parse(event.data);
     // Update Redux store
     dispatch(setOrders(message.payload.orders));
     dispatch(setBots(message.payload.bots));
   };
   ```

3. **Error Handling**
   ```javascript
   eventSource.onerror = () => {
     eventSource.close();
     // Reconnect after 3 seconds
     setTimeout(() => window.location.reload(), 3000);
   };
   ```

### Message Format
```json
{
  "type": "state-update",
  "payload": {
    "orders": [...],
    "bots": [...]
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### State Change Triggers
- Order created
- Bot created
- Bot removed
- Order status changed (PENDING → PROCESSING → COMPLETE)
- System reset

---

## Development Guide

### Prerequisites
- Node.js 20+
- npm 9+
- Git

### Setup
```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Development mode (both server and client)
npm run dev

# Server only
npm run server:dev

# Client only
npm run client:dev
```

### Build
```bash
# Full build
npm run build

# Server only
npm run server:build

# Client only
npm run client:build
```

### Testing
```bash
# Run all tests
npm test

# Test script
./scripts/test.sh
```

### Running Locally
```bash
# Production build and start
npm run build
npm start

# Server runs on http://localhost:3001
# Frontend served from http://localhost:3001
```

### Development Workflow
1. Make changes to source files
2. TypeScript auto-compiles (in watch mode)
3. Browser auto-refreshes (Vite HMR)
4. Test changes locally
5. Commit and push to main
6. GitHub Actions runs tests and deploys

---

## Deployment Guide

### Render Deployment

#### Prerequisites
- GitHub repository
- Render account

#### Steps
1. Create Render Web Service
2. Connect GitHub repository
3. Configure build/start commands
4. Get deploy hook URL
5. Add to GitHub Secrets as `RENDER_DEPLOY_HOOK`
6. Push to main branch

#### Build Command
```bash
npm install && npm run build
```

#### Start Command
```bash
npm start
```

#### Environment Variables
- `NODE_ENV`: production
- `PORT`: 3001

### GitHub Actions Workflows

#### Deploy Workflow (`.github/workflows/deploy.yaml`)
**Triggers**: Push to main

**Steps**:
1. Checkout code
2. Setup Node.js 20
3. Install dependencies
4. Run tests
5. Build server and client
6. Verify build artifacts
7. Trigger Render deployment

#### Backend Verification (`.github/workflows/backend-verify-result.yaml`)
**Triggers**: Pull requests to main

**Steps**:
1. Checkout code
2. Setup Node.js 20
3. Install dependencies
4. Make scripts executable
5. Run test.sh
6. Run build.sh
7. Verify build artifacts
8. Verify result.txt format

---

## Testing

### Test Suite
**Location**: `server/tests/run.cjs`

**Coverage**:
- OrderManager (10 tests)
- Rate Limiter (5 tests)
- Logger (10 tests)
- Build Artifacts (4 tests)
- Scripts (3 tests)

**Total**: 32 tests, all passing

### Running Tests
```bash
npm test
```

### Test Categories

#### OrderManager Tests
- Create normal order
- Create VIP order
- Order IDs unique and incrementing
- Create bot
- Bot IDs unique and incrementing
- Remove bot returns correct bot
- Remove bot from empty list returns null
- Get state returns correct structure
- Clear all resets state
- VIP orders have higher priority

#### Rate Limiter Tests
- API limiter configuration
- Order limiter configuration
- Bot limiter configuration
- State limiter configuration
- Rate limits are reasonable

#### Logger Tests
- Logger has required methods
- Logger can log info/error/warn/success
- Logger can log domain-specific events
- Logger can save to file

#### Build Tests
- Package.json files exist

#### Scripts Tests
- build.sh exists
- run.sh exists
- test.sh exists

---

## Key Features Explained

### VIP Order Priority
Orders are processed in this priority:
1. VIP orders (first)
2. Normal orders (second)

When a bot becomes idle, it automatically picks up the next pending order, prioritizing VIP orders.

### 10-Second Processing Time
Each order takes exactly 10 seconds to process:
- Configured in `server/orderManager.ts`: `PROCESSING_TIME_MS = 10000`
- Easy to adjust for different scenarios

### Real-time Updates
All state changes are broadcast to connected clients via SSE:
- No polling required
- Instant updates across all clients
- Automatic reconnection on disconnect

### Rate Limiting
Protects API from abuse:
- Different limits for different endpoints
- Returns 429 status when exceeded
- Includes RateLimit headers

### Logging
Comprehensive logging system:
- Console output with timestamps
- File output to `scripts/result.txt`
- Structured format for easy parsing
- Domain-specific logging methods

---

## Performance Considerations

### Frontend
- Full-screen responsive layout
- Efficient Redux state management
- SSE for real-time updates (no polling)
- Tailwind CSS for optimized styling

### Backend
- Efficient state management in memory
- Rate limiting to prevent abuse
- SSE broadcast to all clients
- Graceful shutdown with log persistence

### Scalability
- Current: Single server, in-memory state
- Future: Database for persistence, multiple servers with shared state

---

## Troubleshooting

### SSE Not Updating
1. Check browser console for errors
2. Verify `/api/events` endpoint is accessible
3. Check CORS configuration
4. Verify EventSource connection in useSSE.ts

### Build Fails
1. Check Node.js version (20+)
2. Verify all dependencies installed
3. Check TypeScript compilation errors
4. Run `npm install` in both root and client

### Tests Fail
1. Verify build artifacts exist
2. Check test.sh is executable
3. Run `npm test` directly
4. Check for port conflicts

### Deployment Issues
1. Check GitHub Actions logs
2. Verify Render deploy hook is set
3. Check environment variables
4. Review Render service logs

---

## Contributing

### Code Style
- TypeScript for type safety
- Functional components in React
- Redux for state management
- Tailwind CSS for styling

### Before Committing
1. Run tests: `npm test`
2. Build: `npm run build`
3. Check for TypeScript errors
4. Format code consistently

### Pull Request Process
1. Create feature branch
2. Make changes
3. Run tests and build
4. Push to GitHub
5. Create pull request
6. GitHub Actions verifies
7. Merge when approved

---

## Additional Resources

- [React Documentation](https://react.dev)
- [Express.js Documentation](https://expressjs.com)
- [Redux Toolkit Documentation](https://redux-toolkit.js.org)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [Render Documentation](https://render.com/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

## License

ISC

---

## Support

For issues or questions:
1. Check this documentation
2. Review code comments
3. Check GitHub Issues
4. Review test cases for usage examples

---

**Last Updated**: May 2026
**Version**: 1.0.0
**Status**: Production Ready ✅
