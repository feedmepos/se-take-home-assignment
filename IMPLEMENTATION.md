# McDonald's Order Management System - Implementation Guide

This document describes the implementation of McDonald's automated order management system built with Node.js. The system manages customer orders through an automated cooking bot workforce, implementing priority-based queuing and dynamic resource allocation.

## Overview

The system simulates an automated kitchen operation where cooking bots process customer orders. It implements a priority queue system where VIP customers receive preferential treatment while maintaining fairness within each customer tier.

### Key Capabilities

- **Dual-tier Order Processing**: Normal and VIP customer tiers with automatic prioritization
- **Dynamic Bot Workforce**: Add or remove cooking bots on demand
- **Intelligent Queue Management**: Automatic order assignment based on priority rules
- **Real-time Status Tracking**: Monitor bots, pending orders, and completed orders
- **Graceful Interruption Handling**: Orders interrupted by bot removal are properly requeued

## System Components

### Module Organization

The codebase follows a modular architecture with clear separation of concerns. All source code is organized in the `src/` directory:

```
src/
├── helper.js       → Utility functions and shared helpers
├── order.js        → Order entity definition
├── bot.js          → Bot worker implementation
├── controller.js   → System orchestration and queue management
├── index.js        → Command-line interface and demonstration
├── helper.test.js  → Tests for helper functions
├── order.test.js   → Tests for order entity
├── bot.test.js     → Tests for bot worker
└── controller.test.js → Tests for system controller
```

### Core Entities

#### Order Entity (`src/order.js`)

Represents a McDonald's customer order with the following attributes:

- **Identifier**: Auto-generated unique ID (sequential numbering starting from #1)
- **Customer Tier**: `NORMAL` or `VIP` classification
- **State**: Current status (`PENDING` or `COMPLETE`)
- **Metadata**: Creation timestamp for tracking

#### Bot Worker (`src/bot.js`)

Represents a McDonald's cooking bot with:

- **Bot ID**: Unique identifier for each bot (e.g., Bot #1, Bot #2)
- **Operational State**: `IDLE` (available) or `PROCESSING` (busy)
- **Current Assignment**: Reference to the order being processed
- **Processing Timer**: 10-second cooking time per order

Key operations:

- `startProcessing()`: Begin order processing with callback on completion
- `completeProcessing()`: Mark order complete and return to idle state
- `stopProcessing()`: Interrupt current work and return order for requeue

#### System Controller (`src/controller.js`)

Central coordinator managing the entire system:

**Queue Management**:

- Maintains separate tracking for pending and completed orders
- Implements priority insertion logic for VIP orders
- Handles order requeuing when bots are interrupted

**Bot Lifecycle**:

- Creates new bot workers on demand
- Removes bots (newest first) with proper cleanup
- Automatically assigns work to idle bots

**Status Reporting**:

- Provides formatted status snapshots
- Tracks bot states, queue lengths, and completion statistics

## Priority System

### Queue Ordering Rules

1. **Tier-Based Priority**: All VIP orders precede Normal orders
2. **FIFO Within Tier**: Orders of the same tier maintain first-in-first-out order
3. **Smart Insertion**: New VIP orders insert after existing VIPs but before any Normal orders

### Interruption Handling

When a bot is removed during active processing:

- **VIP Order Interruption**: Order is requeued at the **beginning** of the VIP section (becomes the next VIP to process)
- **Normal Order Interruption**: Order is requeued at the **start** of the Normal section (becomes the next Normal to process, still after all VIPs)
- **Processing Reset**: Interrupted orders restart from the full 10-second cooking duration (ensures food quality standards)

This ensures fairness: interrupted orders don't lose their position relative to others of the same tier.

## Getting Started

### Prerequisites

- Node.js (v22.19.0 or compatible)
- npm package manager

### Installation

```bash
# Install dependencies (Jest for testing)
npm install
```

### Execution

```bash
# Run the demonstration scenario
./scripts/run.sh

# Output is written to scripts/result.txt
```

### Testing

```bash
# Execute test suite
npm test

# Or use the test script
./scripts/test.sh
```

## API Reference

### Creating Orders

```javascript
const { OrderController } = require("./src/controller");
const controller = new OrderController();

// Add a standard McDonald's order (appends to Normal queue)
const normalOrder = controller.addNormalOrder();

// Add a VIP order (inserts in VIP section, prioritized over Normal)
const vipOrder = controller.addVipOrder();
```

### Managing Cooking Bots

```javascript
// Add a new cooking bot (immediately starts processing if orders available)
const newBot = controller.addBot();

// Remove the most recently added bot
// If processing, order is requeued at front of its tier
const removedBot = controller.removeBot();
```

### Status Queries

```javascript
// Print formatted status snapshot to console
controller.printStatus();

// Get status object for programmatic access
const status = controller.getStatus();
// Returns: { bots, botsDetail, pendingOrders, pendingOrdersDetail,
//            completedOrders, completedOrdersDetail }
```

## Test Suite

The project uses Jest for comprehensive testing. Tests are organized by module in the `src/` directory:

- **`src/helper.test.js`**: Validates utility functions (timestamp formatting)
- **`src/order.test.js`**: Tests order creation and properties
- **`src/bot.test.js`**: Verifies cooking bot state management and interruption handling
- **`src/controller.test.js`**: Validates queue logic, priority ordering, and requeue behavior

### Test Scenarios

Key test cases include:

- Sequential order ID generation
- VIP priority enforcement
- FIFO ordering within tiers
- Bot interruption and order recovery
- Requeue positioning (front of tier)

Run all tests: `npm test`

## Demonstration Scenario

The included demonstration (`src/index.js`) exercises the McDonald's order management system through a realistic workflow:

1. **Initialization**: Create first cooking bot, verify idle state
2. **Normal Orders**: Add standard McDonald's orders, observe processing
3. **VIP Insertion**: Add VIP orders, verify priority placement ahead of Normal orders
4. **Scale Up**: Add additional cooking bots for parallel processing
5. **Mixed Workload**: Add orders of both types during active processing
6. **Scale Down**: Remove a bot mid-processing, verify order recovery and requeue
7. **Completion**: Wait for all orders to finish, display final statistics

Output includes timestamped events (`HH:MM:SS` format) and periodic status snapshots.

## Project Layout

```
├── src/
│   ├── helper.js          # Shared utilities (timestamp formatting)
│   ├── order.js           # McDonald's order entity
│   ├── bot.js             # Cooking bot implementation
│   ├── controller.js      # Order management controller
│   ├── index.js           # CLI demo application
│   ├── helper.test.js     # Helper function tests
│   ├── order.test.js      # Order entity tests
│   ├── bot.test.js        # Bot worker tests
│   └── controller.test.js # Controller integration tests
├── package.json           # Project metadata and scripts
├── IMPLEMENTATION.md      # This documentation file
└── scripts/
    ├── build.sh           # Dependency installation
    ├── test.sh            # Test execution wrapper
    ├── run.sh             # Demo execution wrapper
    └── result.txt         # Demo output file
```

## Technical Specifications

### Technology Stack

- **Runtime**: Node.js (JavaScript ES6+)
- **Testing**: Jest testing framework
- **Dependencies**: Jest (development only, no production dependencies)

### Processing Model

- **Cooking Duration**: 10 seconds per McDonald's order (simulated via `setTimeout`)
- **Queue Implementation**: Array-based with `splice()` for priority insertion
- **Concurrency Model**: Event-driven, asynchronous processing
- **Time Format**: `HH:MM:SS` (24-hour format, no date component)

### Design Principles

- **Modularity**: Clear separation of concerns across files
- **Encapsulation**: Requeue logic internal to controller (not exposed as public API)
- **Quality Assurance**: Interrupted orders restart from beginning (ensures food quality, no partial cooking)
- **Testability**: Comprehensive test coverage with Jest

## Implementation Notes

### Architectural Decisions

1. **Source Directory Structure**: All source code organized in `src/` directory for clean project organization
2. **Modular File Structure**: Code split into logical modules (helper, order, bot, controller) rather than monolithic file
3. **Internal Requeue Method**: `requeuePending()` is private to OrderController, maintaining encapsulation
4. **Jest Testing**: Chosen for better async support and test organization vs. vanilla Node.js assertions
5. **Separate Test Files**: One test file per module (`*.test.js`) co-located with source files in `src/`

### Differences from Reference Implementation

- **Code Organization**: Multi-file structure vs. single-file approach
- **Testing Framework**: Jest vs. vanilla Node.js assertions
- **Requeue Strategy**: Internal method vs. external helper function
- **Test Structure**: Per-module test files vs. single test suite

## Requirements Checklist

- ✅ Normal McDonald's orders appear in pending queue
- ✅ VIP orders prioritized ahead of Normal orders (maintains FIFO within each tier)
- ✅ Sequential, unique order numbering (#1, #2, #3...)
- ✅ Cooking bot creation immediately processes available orders
- ✅ Bots enter idle state when queue is empty
- ✅ Bot removal interrupts processing and requeues order at front of its tier
- ✅ In-memory operation (no database or file persistence)
