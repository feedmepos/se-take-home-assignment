# McDonald's Order Management System

A NestJS-based backend system that simulates McDonald's automated cooking bot order management system.

## Overview

This system implements the core requirements for managing orders and cooking bots with priority queuing for VIP customers. The system handles:

- Order creation (Normal and VIP)
- Bot management (adding/removing bots)
- Priority queuing (VIP orders processed before Normal orders)
- Order processing with 10-second completion time
- Real-time status tracking

## Architecture

### Core Components

1. **Order Entity** (`src/entities/order.entity.ts`)
   - Represents individual orders with unique IDs
   - Supports Normal and VIP order types
   - Tracks order status (PENDING, PROCESSING, COMPLETE)

2. **Bot Entity** (`src/entities/bot.entity.ts`)
   - Represents cooking bots
   - Tracks bot status (IDLE, PROCESSING)
   - Manages current order assignment

3. **OrderService** (`src/services/order.service.ts`)
   - Manages order lifecycle
   - Implements priority queuing logic
   - Handles order state transitions

4. **BotService** (`src/services/bot.service.ts`)
   - Manages bot lifecycle
   - Handles order processing with 10-second timeouts
   - Implements bot addition/removal logic

5. **CliController** (`src/controllers/cli.controller.ts`)
   - Provides CLI interface for system operations
   - Runs simulation scenarios
   - Generates timestamped logs

## Key Features

### Priority Queuing
- VIP orders are always processed before Normal orders
- Within the same type, orders are processed in FIFO order
- When a VIP order is created, it jumps to the front of the queue (after existing VIP orders)

### Bot Management
- Bots can be added dynamically and immediately start processing pending orders
- When a bot is removed, if it's processing an order, that order returns to PENDING status
- Bots automatically pick up new orders when they become idle

### Order Processing
- Each order takes exactly 10 seconds to process
- Orders move through states: PENDING → PROCESSING → COMPLETE
- System tracks timestamps for all state transitions

### Edge Case Handling
- **Input Validation**: All inputs are validated with proper error messages
- **State Transition Protection**: Invalid state transitions are prevented and logged
- **Memory Management**: Automatic cleanup of completed orders to prevent memory issues
- **Resource Limits**: Maximum limits on orders (10,000) and bots (100) to prevent resource exhaustion
- **Concurrent Access Protection**: Race condition prevention for order processing
- **Stuck Order Recovery**: Automatic detection and recovery of orders stuck in processing
- **Orphaned Timeout Cleanup**: Cleanup of timeouts when bots are removed unexpectedly
- **System Integrity Validation**: Continuous monitoring of system health
- **Graceful Shutdown**: Proper cleanup of resources during system shutdown

## Usage

### Building the Application
```bash
./scripts/build.sh
```

### Running Tests
```bash
./scripts/test.sh
```

### Running the Application
```bash
./scripts/run.sh
```

The application will run a comprehensive simulation that demonstrates all system features and outputs results to `scripts/result.txt` with timestamps in HH:MM:SS format.

## Simulation Flow

The system runs a predefined simulation that demonstrates:

1. **Creating Normal Orders**: 3 normal orders are created and queued
2. **Adding Bot**: A bot is added and immediately starts processing the first order
3. **VIP Priority**: A VIP order is created and jumps to the front of the queue
4. **Multiple Bots**: Another bot is added to handle the increased workload
5. **Mixed Orders**: More normal and VIP orders are created
6. **Bot Removal**: A bot is removed, demonstrating order re-queuing
7. **Status Tracking**: Real-time status updates show system state

## Requirements Compliance

✅ **Order Management**
- Unique, increasing order numbers
- Normal and VIP order types
- Orders flow from PENDING to COMPLETE

✅ **Priority Queuing**
- VIP orders processed before Normal orders
- VIP orders queue behind existing VIP orders
- Normal orders queue behind all VIP orders

✅ **Bot Management**
- Dynamic bot addition/removal
- Immediate order processing when bots are added
- Order re-queuing when bots are removed

✅ **Processing Logic**
- 10-second processing time per order
- One order per bot at a time
- Automatic order pickup when bots become idle

✅ **CLI Requirements**
- NestJS backend implementation
- Executable scripts (test.sh, build.sh, run.sh)
- Timestamped output in HH:MM:SS format
- Results written to result.txt

## Testing

The system includes comprehensive unit tests covering:
- Order creation and management
- Priority queuing logic
- Bot lifecycle management
- Order processing workflows
- State transitions
- **Edge case scenarios** (39 total tests)

### Edge Case Test Coverage
- Invalid input handling
- State transition protection
- Concurrent access scenarios
- Memory and performance limits
- System integrity validation
- Resource cleanup and recovery
- Error handling and logging

Run tests with: `npm test`

## Technical Details

- **Framework**: NestJS (Node.js)
- **Language**: TypeScript
- **Testing**: Jest with comprehensive edge case coverage
- **Architecture**: Service-oriented with dependency injection
- **Concurrency**: Uses setTimeout for order processing simulation with proper cleanup
- **Memory**: In-memory storage with automatic cleanup (no persistence required)
- **Error Handling**: Comprehensive logging and error recovery
- **Resource Management**: Automatic cleanup and graceful shutdown

## File Structure

```
src/
├── entities/
│   ├── order.entity.ts
│   └── bot.entity.ts
├── services/
│   ├── order.service.ts
│   ├── order.service.spec.ts
│   ├── bot.service.ts
│   ├── bot.service.spec.ts
│   └── edge-cases.spec.ts
├── controllers/
│   └── cli.controller.ts
├── dto/
│   └── create-order.dto.ts
├── app.module.ts
└── main.ts
```

## Edge Case Handling Summary

The system now includes comprehensive edge case handling that makes it production-ready:

### **Input Validation & Error Handling**
- ✅ Invalid order types are rejected with clear error messages
- ✅ Invalid order IDs are validated and logged
- ✅ All service operations include try-catch error handling
- ✅ File I/O operations are protected with error handling

### **State Management & Concurrency**
- ✅ Invalid state transitions are prevented and logged
- ✅ Race conditions in order processing are handled
- ✅ Concurrent access to the same order is prevented
- ✅ Bot state validation before processing orders

### **Resource Management**
- ✅ Memory limits prevent resource exhaustion (10,000 orders, 100 bots)
- ✅ Automatic cleanup of completed orders
- ✅ Orphaned timeout cleanup when bots are removed
- ✅ Graceful shutdown with proper resource cleanup

### **System Integrity & Recovery**
- ✅ Continuous system integrity validation
- ✅ Stuck order detection and recovery (15+ second timeout)
- ✅ Duplicate ID detection and prevention
- ✅ Emergency reset capabilities for stuck systems

### **Performance & Scalability**
- ✅ Efficient priority queue implementation
- ✅ Performance testing with large order volumes
- ✅ Memory usage optimization
- ✅ Cleanup operations to prevent memory leaks

The system successfully demonstrates all required functionality with robust edge case handling and provides a solid, production-ready foundation for the McDonald's automated cooking bot order management system.
