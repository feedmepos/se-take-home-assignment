# Implementation Documentation

## Overview

This is a Go-based CLI application that simulates McDonald's automated cooking bot order management system. The application handles order processing with priority queuing for VIP customers and dynamic bot management.

## Architecture

### Project Structure

```
se-take-home-assignment/
├── cmd/
│   └── main.go                 # CLI application entry point
├── internal/
│   ├── controller/
│   │   ├── order.go            # Order controller logic
│   │   └── order_test.go       # Unit tests
│   └── logger/
│       └── logger.go           # Thread-safe logging with timestamps
├── scripts/
│   ├── build.sh                # Build script
│   ├── test.sh                 # Test script
│   ├── run.sh                  # Run script
│   └── result.txt              # Output file (generated)
├── go.mod                      # Go module definition
└── .github/
    └── workflows/
        └── backend-verify-result.yaml  # GitHub Actions workflow
```

## Core Components

### 1. Order Controller (`internal/controller/order.go`)

The `OrderController` manages the entire order processing system:

- **Order Types**: Normal and VIP orders
- **Order States**: PENDING → PROCESSING → COMPLETE
- **Priority Queue**: VIP orders are always processed before normal orders. New VIP orders queue behind existing VIP orders but before all normal orders.

**Key Methods:**
- `CreateNormalOrder()`: Creates a normal order and adds it to the pending queue
- `CreateVIPOrder()`: Creates a VIP order with proper priority insertion
- `AddBot()`: Creates a new bot that immediately starts processing pending orders
- `RemoveBot()`: Removes the newest bot; if processing, returns order to pending
- `assignOrdersToBots()`: Automatically assigns pending orders to idle bots

### 2. Bot Processing

Each bot:
- Processes one order at a time
- Takes exactly 10 seconds to complete an order
- Automatically picks up the next pending order when idle
- Can be interrupted (when removed) - order returns to pending queue

### 3. Logger (`internal/logger/logger.go`)

Thread-safe logger that:
- Formats all messages with timestamps in `HH:MM:SS` format
- Uses mutex protection for concurrent access
- Collects all output for writing to `result.txt`

## Key Features

### Priority Queue Implementation

VIP orders are inserted using the following logic:
1. Find the last VIP order in the pending queue
2. Insert the new VIP order immediately after all existing VIP orders
3. All normal orders remain after VIP orders

This ensures:
- VIP orders are always processed before normal orders
- New VIP orders queue behind existing VIP orders (FIFO for VIP)
- Normal orders maintain FIFO order

### Thread Safety

All operations use mutex locks to ensure thread safety:
- Order creation and modification
- Bot management
- Queue operations
- Logging

### Order Processing Flow

1. Order created → Added to pending queue (with priority if VIP)
2. Bot picks up order → Order status: PROCESSING
3. Bot processes for 10 seconds
4. Order completed → Order status: COMPLETE
5. Bot becomes idle → Automatically picks up next pending order

## Running the Application

### Prerequisites

- Go 1.23 or later
- Bash shell

### Build

```bash
./scripts/build.sh
```

This compiles the Go application and creates the `order-controller` binary.

### Test

```bash
./scripts/test.sh
```

Runs all unit tests to verify functionality.

### Run

```bash
./scripts/run.sh
```

Executes the CLI application, which:
1. Simulates order creation (normal and VIP)
2. Adds bots to process orders
3. Demonstrates bot removal
4. Outputs all events with timestamps to `scripts/result.txt`

## Test Coverage

Unit tests cover:
- Normal order creation
- VIP order creation and priority
- Bot creation and removal
- Order processing
- Bot removal during processing
- Priority queue correctness

## Output Format

The `result.txt` file contains:
- All events with timestamps in `HH:MM:SS` format
- Order creation events
- Bot status changes
- Order processing completion
- Final system status summary

Example output:
```
[14:32:01] Created Normal Order #1001 - Status: PENDING
[14:32:02] Created VIP Order #1002 - Status: PENDING
[14:32:03] Bot #1 created - Status: ACTIVE
[14:32:03] Bot #1 picked up VIP Order #1002 - Status: PROCESSING
[14:32:13] Bot #1 completed VIP Order #1002 - Status: COMPLETE (Processing time: 10s)
```

## GitHub Actions Integration

The `.github/workflows/backend-verify-result.yaml` workflow:
1. Sets up Go 1.23.9
2. Makes scripts executable
3. Runs tests (`test.sh`)
4. Builds the application (`build.sh`)
5. Runs the application (`run.sh`)
6. Verifies `result.txt` exists, is not empty, and contains timestamps

## Design Decisions

1. **In-memory storage**: No persistence as per requirements
2. **Goroutines for processing**: Each bot processes orders concurrently
3. **Mutex-based synchronization**: Ensures thread safety
4. **Priority queue as slice**: Simple insertion logic for VIP orders
5. **10-second processing**: Uses time-based ticker for accurate timing

## Future Enhancements (Not Implemented)

- Order cancellation
- Bot status monitoring API
- Order history persistence
- Web interface
- Configuration file support

