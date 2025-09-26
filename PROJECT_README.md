# McDonald's Order Management System

A Go-based CLI application that simulates McDonald's automated cooking bot system for order management.

## Overview

This project implements an order controller that manages the flow of orders through a cooking system with the following features:

- **Priority Queue System**: VIP orders are processed before normal orders
- **Dynamic Bot Management**: Add/remove cooking bots at runtime
- **10-Second Processing Time**: Each order takes exactly 10 seconds to complete
- **Real-time Timestamps**: All operations are logged with HH:MM:SS timestamps
- **Concurrent Processing**: Multiple bots can process orders simultaneously

## Project Structure

```
├── cmd/
│   └── main.go                 # CLI application entry point
├── pkg/
│   ├── order/
│   │   ├── types.go           # Order and Bot type definitions
│   │   ├── manager.go         # Core order management logic
│   │   └── manager_test.go    # Unit tests for order management
│   └── simulator/
│       ├── simulator.go       # Simulation logic and output formatting
│       └── simulator_test.go  # Unit tests for simulator
├── scripts/
│   ├── build.sh              # Build script
│   ├── run.sh                # Run script
│   ├── test.sh               # Test script
│   └── result.txt            # Generated output
└── go.mod                    # Go module definition
```

## Key Features

### Order Management
- **Order Types**: Normal and VIP orders
- **Unique IDs**: Orders are assigned sequential IDs starting from 1001
- **Priority Processing**: VIP orders jump to the front of the queue
- **Status Tracking**: PENDING → PROCESSING → COMPLETE

### Bot Management
- **Dynamic Scaling**: Add/remove bots during runtime
- **Concurrent Processing**: Each bot processes one order at a time
- **Graceful Shutdown**: Removing a bot while processing returns the order to pending
- **Idle State**: Bots become idle when no orders are available

### Priority Queue Implementation
- Uses Go's `container/heap` package for efficient priority queue
- VIP orders have higher priority than normal orders
- Within the same type, earlier orders have higher priority

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

The output will be written to `scripts/result.txt` with timestamps showing the order processing flow.

## Example Output

```
McDonald's Order Management System - Simulation Results

[14:32:01] System initialized with 0 bots
[14:32:01] Created Normal Order #1001 - Status: PENDING
[14:32:02] Created VIP Order #1002 - Status: PENDING
[14:32:03] Bot #1 created - Status: ACTIVE
[14:32:03] Bot #1 picked up VIP Order #1002 - Status: PROCESSING
[14:32:13] Bot #1 completed VIP Order #1002 - Status: COMPLETE (Processing time: 10s)

Final Status:
- Total Orders Processed: 4 (2 VIP, 2 Normal)
- Orders Completed: 4
- Active Bots: 1
- Pending Orders: 0
```

## Technical Implementation

### Concurrency
- Uses goroutines for bot processing
- Mutex locks for thread-safe access to shared data structures
- Each bot runs in its own goroutine for concurrent order processing

### Data Structures
- **OrderHeap**: Implements `heap.Interface` for priority queue
- **OrderManager**: Central coordinator for orders and bots
- **Simulator**: Demonstrates the system with realistic timing

### Testing
- Comprehensive unit tests covering all major functionality
- Tests for priority queue behavior, bot management, and order processing
- Integration tests for the complete simulation flow

## Requirements Met

✅ **Priority Queue**: VIP orders processed before normal orders  
✅ **Unique Order IDs**: Sequential IDs starting from 1001  
✅ **10-Second Processing**: Each order takes exactly 10 seconds  
✅ **Dynamic Bot Management**: Add/remove bots at runtime  
✅ **Graceful Bot Removal**: Processing orders returned to pending when bot removed  
✅ **Timestamped Output**: All operations logged with HH:MM:SS format  
✅ **CLI Application**: Executable in GitHub Actions environment  
✅ **Unit Tests**: Comprehensive test coverage  
✅ **Build Scripts**: Proper build, test, and run scripts  

## Dependencies

- Go 1.19+ (uses standard library only)
- No external dependencies required

## GitHub Actions Compatibility

The application is designed to work seamlessly with GitHub Actions:
- Builds successfully with `go build`
- Tests pass with `go test`
- Generates proper output to `result.txt`
- Follows the required script structure
