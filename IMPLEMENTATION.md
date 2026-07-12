# McDonald's Order Controller - Go Implementation

This is a Go-based CLI application that simulates a McDonald's automated cooking bot order controller system.

## Architecture

The application is structured as follows:

```
├── cmd/
│   └── main.go              # CLI application entry point
├── pkg/
│   └── controller/
│       ├── controller.go    # Core business logic
│       └── controller_test.go # Unit tests
├── scripts/
│   ├── build.sh            # Build script
│   ├── run.sh              # Run script
│   ├── test.sh             # Test script
│   └── result.txt          # Application output
├── go.mod                  # Go module definition
└── README.md               # Original assignment
```

## Key Components

### Order
- **ID**: Unique, incrementing order identifier
- **Type**: Either Normal or VIP
- **Status**: PENDING, PROCESSING, or COMPLETE
- **CreateAt**: Timestamp of order creation

### Bot
- **ID**: Unique bot identifier
- **Status**: Idle or Processing
- **CurrentOrder**: Reference to the order being processed
- Includes goroutine management for concurrent processing

### OrderController
Main controller that manages the entire system with thread-safe operations using RWMutex.

## Features Implemented

### ✅ Requirement 1: Normal Order Creation
- Creates orders with unique, incrementing IDs
- Orders appear in PENDING area immediately

### ✅ Requirement 2: VIP Order Priority
- VIP orders are inserted before normal orders in the queue
- Multiple VIP orders maintain FIFO order among themselves
- Normal orders are placed after all VIP orders

### ✅ Requirement 3: Unique Order Numbers
- Order IDs are unique and incrementing (1, 2, 3, ...)
- Thread-safe implementation ensures no race conditions

### ✅ Requirement 4: Bot Processing
- Bots process orders from the pending queue
- Each order takes exactly 10 seconds to complete
- Orders move from PENDING → PROCESSING → COMPLETE

### ✅ Requirement 5: Bot Idle State
- Bots become IDLE when no orders are pending
- Automatically resume processing when new orders arrive

### ✅ Requirement 6: Bot Removal
- Removes the newest bot (LIFO)
- If bot is processing, the order returns to PENDING queue
- Maintains VIP priority when returning interrupted orders

### ✅ Requirement 7: In-Memory Processing
- No external database or persistence
- All state maintained in memory during execution

## Concurrency & Thread Safety

The implementation uses:
- `sync.RWMutex` for thread-safe access to shared state
- Goroutines for concurrent order processing
- Channels for bot stop signaling
- WaitGroups for proper goroutine lifecycle management

## Testing

Comprehensive unit tests cover:
- Order creation (normal and VIP)
- VIP priority queue behavior
- Bot lifecycle management
- Concurrent processing scenarios
- Bot removal during processing
- Order completion flow

Run tests with: `./scripts/test.sh`

## Usage

1. **Build**: `./scripts/build.sh`
2. **Run**: `./scripts/run.sh`
3. **Test**: `./scripts/test.sh`

The CLI application runs a complete simulation demonstrating all requirements and outputs results to `scripts/result.txt`.

## Sample Output

The application demonstrates:
1. Creating normal and VIP orders
2. VIP order prioritization
3. Bot creation and processing
4. Order completion after 10 seconds
5. Bot removal scenarios
6. Complex queue behaviors

See `scripts/result.txt` for the complete simulation output.

## Performance Characteristics

- **Time Complexity**: O(n) for VIP order insertion, O(1) for most operations
- **Space Complexity**: O(n) where n is the number of orders and bots
- **Concurrency**: Supports multiple bots processing orders simultaneously
- **Thread Safety**: All operations are thread-safe using mutex locking

## Code Quality

- Clean, readable Go code following standard conventions
- Comprehensive error handling
- Extensive unit test coverage
- Proper separation of concerns
- Thread-safe concurrent operations
- Detailed comments and documentation