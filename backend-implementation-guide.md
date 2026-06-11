# McDonald's Order Management System - Backend Implementation Guide

## Overview
Build a CLI-based order management system for McDonald's automated cooking bots using **Node.js**.

## Implementation Summary
- **Language**: Node.js (>=14.0.0)
- **Order IDs**: Start from 1, auto-incrementing
- **Processing Time**: Exactly 10 seconds per order (requirement)
- **Output**: scripts/result.txt with HH:MM:SS timestamps
- **Approach**: Minimal implementation following Karpathy guidelines

## Core Requirements

### Order Management
- **Normal Orders**: Standard customer orders, processed in FIFO order
- **VIP Orders**: Priority processing - queue ahead of normal orders but behind existing VIP orders
- **Unique Order Numbers**: Auto-incrementing, globally unique identifiers

### Bot Management
- **Processing Time**: 10 seconds per order
- **Concurrency**: Each bot processes one order at a time
- **Dynamic Scaling**: Add/remove bots during runtime
- **State Tracking**: IDLE, PROCESSING states

### Order Flow States
1. **PENDING**: Orders waiting for processing
2. **COMPLETE**: Orders finished by bots

## Technical Requirements

### Language & Structure
- **Language**: Go (Golang) or Node.js
- **Type**: CLI application executable in GitHub Actions
- **Memory Only**: No persistent storage required

### Required Scripts (in `/scripts/` directory)
- `test.sh`: Unit test execution
- `build.sh`: Compilation steps  
- `run.sh`: CLI application execution

### Output Requirements
- **File**: `result.txt` in project root
- **Format**: Include timestamps in `HH:MM:SS` format
- **Content**: Order completion tracking with timestamps

### GitHub Integration
- **Workflow**: Must pass `backend-verify-result` GitHub Action
- **Submission**: Pull Request following GitHub Flow
- **Testing**: All tests in `test.sh` must pass

## Core Functionality

### Order Operations
```
New Normal Order -> PENDING queue (end of normal orders)
New VIP Order    -> PENDING queue (after VIP orders, before normal orders)
```

### Bot Operations
```
+ Bot: Create bot -> Pick up first PENDING order -> Process 10s -> Move to COMPLETE -> Repeat
- Bot: Remove newest bot -> Stop processing -> Return order to original PENDING position
```

### Priority Queue Logic
```
PENDING Queue Order: [VIP Orders (FIFO)] + [Normal Orders (FIFO)]
```

## Implementation Priorities

### Must Have
1. Order creation with unique IDs
2. VIP/Normal priority queue management
3. Bot lifecycle (create/destroy/process)
4. 10-second processing simulation
5. Order state transitions (PENDING → COMPLETE)
6. Timestamp logging in `result.txt`

### Edge Cases
1. Bot removal during processing (return order to correct position)
2. Multiple bots processing simultaneously
3. Empty queue handling (bots go IDLE)
4. Concurrent bot operations

## Success Criteria
- ✅ CLI runs in GitHub Actions environment
- ✅ All `test.sh` tests pass
- ✅ `result.txt` contains timestamped order completions
- ✅ GitHub Action workflow passes
- ✅ VIP priority queue works correctly
- ✅ Bot scaling (add/remove) works during runtime

## Next Steps
1. Choose implementation language (Go/Node.js)
2. Design core data structures (orders, bots, queues)
3. Implement CLI interface for order/bot management
4. Add 10-second processing simulation
5. Create comprehensive test suite
6. Ensure GitHub Actions compatibility

## System Flow (Node.js Implementation)

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLI Application Start                    │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│              Initialize System State                            │
│  • orderQueue = []                                             │
│  • bots = []                                                   │
│  • orderIdCounter = 1                                          │
│  • completedOrders = []                                        │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                   Main Event Loop                               │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │New Normal   │  │New VIP      │  │+ Bot        │            │
│  │Order        │  │Order        │  │             │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         │                │                │                    │
│         ▼                ▼                ▼                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │Create Order │  │Create VIP   │  │Create Bot & │            │
│  │Add to End   │  │Insert Before│  │Start Worker │            │
│  │of Queue     │  │Normal Orders│  │             │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
│  ┌─────────────┐                                               │
│  │- Bot        │                                               │
│  │             │                                               │
│  └──────┬──────┘                                               │
│         │                                                      │
│         ▼                                                      │
│  ┌─────────────┐                                               │
│  │Remove Bot & │                                               │
│  │Return Order │                                               │
│  │to Queue     │                                               │
│  └─────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      Bot Worker Process                         │
└─────────────────────┬───────────────────────────────────────────┘
                      │
            ┌─────────▼─────────┐
            │ Queue has orders? │
            └─────────┬─────────┘
                      │
              ┌───────▼───────┐
              │     Yes       │
              └───────┬───────┘
                      │
            ┌─────────▼─────────┐
            │ Pick first order  │
            │ (VIP priority)    │
            └─────────┬─────────┘
                      │
            ┌─────────▼─────────┐
            │ Process 10 seconds│
            │ setTimeout(10000) │
            └─────────┬─────────┘
                      │
            ┌─────────▼─────────┐
            │ Move to COMPLETE  │
            │ Log with timestamp│
            └─────────┬─────────┘
                      │
                      └─────────┐
                                │
              ┌───────▼───────┐ │
              │      No       │ │
              └───────┬───────┘ │
                      │         │
            ┌─────────▼─────────┼─┐
            │   Bot goes IDLE   │ │
            │   Wait for orders │ │
            └───────────────────┘ │
                      ▲           │
                      └───────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     Data Structures                             │
│                                                                 │
│  Order: {                                                       │
│    id: number,                                                  │
│    type: 'NORMAL' | 'VIP',                                      │
│    status: 'PENDING' | 'PROCESSING' | 'COMPLETE',              │
│    timestamp: Date                                              │
│  }                                                              │
│                                                                 │
│  Bot: {                                                         │
│    id: number,                                                  │
│    status: 'IDLE' | 'PROCESSING',                               │
│    currentOrder: Order | null,                                  │
│    worker: NodeJS.Timeout | null                                │
│  }                                                              │
│                                                                 │
│  Queue Priority: [VIP Orders (FIFO)] + [Normal Orders (FIFO)]  │
└─────────────────────────────────────────────────────────────────┘
```

## Node.js Implementation Structure

```
src/
├── index.js              # Interactive CLI (for interview demo)
└── demo.js               # Automated demo (for GitHub Actions)

test/
└── system.test.js        # Unit tests (no external dependencies)

scripts/
├── build.sh              # npm install
├── test.sh               # npm test
└── run.sh                # node src/demo.js

package.json              # Node.js configuration (no external deps)
scripts/result.txt        # Generated output (HH:MM:SS timestamps)
```

## Key Implementation Details

### Order Management
- Order IDs start from 1 and auto-increment
- VIP orders inserted after existing VIP orders, before Normal orders
- Priority queue: [VIP Orders (FIFO)] + [Normal Orders (FIFO)]

### Bot Processing
- Each bot processes one order at a time
- Exactly 10 seconds per order (setTimeout(10000))
- Processing time dynamically calculated: `Math.round((Date.now() - startTime) / 1000)`
- Bot goes IDLE when queue is empty

### Bot Removal
- Removes newest bot (array.pop())
- If bot is processing, order returns to PENDING
- Maintains VIP/Normal priority order when returning orders

## Notes
- Keep implementation minimal but complete
- Focus on correctness over performance
- Interactive CLI required for interview round
- Clean, readable code is prioritized