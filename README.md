# McDonald's Order Management System

A CLI-based order management system built with Go that simulates a restaurant order processing workflow with VIP priority queue and bot workers.

## Features

- **Normal Orders**: Standard customer orders processed in FIFO order
- **VIP Orders**: Priority orders that jump ahead of normal orders but queue behind other VIP orders
- **Bot Workers**: Configurable number of cooking bots that process orders concurrently
- **Order Processing**: Each order takes 10 seconds to complete
- **Dynamic Bot Management**: Add or remove bots during runtime
- **Real-time Status Tracking**: Monitor pending and completed orders with timestamps

## Architecture

### Core Components

#### Order
- `ID`: Unique, auto-incrementing order identifier
- `Type`: Either NORMAL or VIP
- `Status`: Either PENDING or COMPLETE

#### Bot
- `ID`: Unique bot identifier
- `processing`: Current order being processed (if any)
- `stopChan`: Channel for graceful shutdown
- `isActive`: Flag to track bot lifecycle

#### Restaurant
- Manages all orders (pending and completed)
- Manages all bots
- Handles order queue with VIP priority
- Thread-safe operations using mutexes
- Outputs timestamped logs to console and result.txt

### Queue Management

The system implements a priority queue where:
1. VIP orders are inserted after existing VIP orders
2. VIP orders are placed before all normal orders
3. Normal orders are appended to the end of the queue

### Bot Behavior

Each bot operates independently:
1. **Idle State**: Waits for orders to arrive
2. **Processing State**: Picks up an order and processes for 10 seconds
3. **Completion**: Moves order to COMPLETE area and returns to idle
4. **Removal**: If removed during processing, the order returns to PENDING

## Project Structure

```
.
├── main.go              # Main application code
├── main_test.go         # Unit tests
├── go.mod              # Go module definition
├── script/
│   ├── test.sh         # Test execution script
│   ├── build.sh        # Build script
│   └── run.sh          # Run script
├── result.txt          # Output file (generated)
└── README.md           # This file
```

## Building and Running

### Prerequisites
- Go 1.21 or higher
- Unix-like environment (Linux, macOS, or WSL)

### Build
```bash
chmod +x script/*.sh
./script/build.sh
```

### Test
```bash
./script/test.sh
```

### Run
```bash
./script/run.sh
```

## Testing

The test suite covers:
- Order creation and ID assignment
- VIP order priority queue behavior
- Multiple VIP orders ordering
- Bot creation and management
- Order processing workflow
- Bot removal during processing
- Concurrent bot operations

Run tests with:
```bash
go test -v -cover
```

## Output Format

All output includes timestamps in `HH:MM:SS` format:

```
[15:04:05] McDonald's Order Management System Started
[15:04:05] New NORMAL Order #1 added to PENDING
[15:04:05] New VIP Order #2 added to PENDING
[15:04:06] Bot #1 created
[15:04:06] Bot #1 processing Order #2 (VIP)
[15:04:16] Bot #1 completed Order #2 (VIP) - moved to COMPLETE
```

## User Story Implementation

### Story 1: Normal Customer
✅ Orders flow to PENDING area
✅ After bot processing, orders move to COMPLETE area

### Story 2: VIP Member
✅ VIP orders are processed before normal orders
✅ VIP orders queue behind existing VIP orders

### Story 3: Manager Bot Control
✅ Increase/decrease bot count dynamically
✅ New bots immediately process pending orders
✅ Removed bots stop processing, orders return to PENDING

### Story 4: Bot Behavior
✅ Process one order at a time
✅ 10 second processing time per order
✅ Return to idle when no orders available

## Requirements Compliance

1. ✅ **Normal Order Button**: Adds order to PENDING
2. ✅ **VIP Order Button**: Adds order to PENDING with priority placement
3. ✅ **Unique Order Numbers**: Auto-incrementing IDs starting from 1
4. ✅ **Add Bot**: Creates bot that processes orders with 10s delay
5. ✅ **Idle Bot State**: Bots wait when no orders available
6. ✅ **Remove Bot**: Stops newest bot, returns order to PENDING if processing
7. ✅ **In-Memory Processing**: No database or persistence required

## Implementation Highlights

### Clean Code Practices
- Single Responsibility Principle: Each struct has a clear purpose
- Thread Safety: Proper use of mutexes to prevent race conditions
- Error Handling: Graceful handling of edge cases
- No External Dependencies: Uses only Go standard library
- Clear Naming: Self-documenting variable and function names

### Concurrency
- Goroutines for each bot worker
- Channel-based communication for bot lifecycle management
- Mutex protection for shared state
- No race conditions (verified with `go test -race`)

### Scalability
- Supports multiple bots processing orders concurrently
- Efficient queue operations
- Minimal resource overhead

## GitHub Actions Integration

The system is designed to work seamlessly with GitHub Actions:
- All scripts are executable and return appropriate exit codes
- Output is written to `result.txt` for verification
- Tests can be run in CI/CD environment
- Build artifacts are created deterministically

## Future Enhancements

Potential improvements (not required for current prototype):
- Web interface for real-time visualization
- Metrics and analytics
- Order cancellation
- Bot priority levels
- Order preparation time variance
- Customer notifications

## License

This is a prototype implementation for demonstration purposes.