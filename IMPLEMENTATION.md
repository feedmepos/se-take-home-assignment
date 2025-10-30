# McDonald's Order Management System

A Node.js CLI application that simulates an automated cooking bot system for McDonald's order processing.

## Overview

This system implements an order controller that manages customer orders and cooking bots with the following features:
- Priority queue for VIP orders
- Automated bot assignment and order processing
- 10-second simulated cooking time per order
- Dynamic bot scaling (add/remove bots)

## Architecture

### Core Components

#### 1. OrderController (`OrderController.js`)
The main controller class that manages:
- **Order Queue**: Maintains pending orders with VIP priority
- **Bot Management**: Handles bot lifecycle and work assignment
- **Order Processing**: Simulates 10-second cooking time
- **Status Tracking**: Monitors system state

#### 2. CLI Application (`index.js`)
Simulates a real-world scenario demonstrating:
- Order creation (Normal and VIP)
- Bot addition and removal
- Order processing flow
- Timestamped logging

#### 3. Unit Tests (`OrderController.test.js`)
Comprehensive test coverage including:
- Order creation and priority handling
- Bot lifecycle management
- Order processing workflow
- System status reporting

## Requirements Met

✅ **Requirement 1**: New Normal Order creation - Orders show up in PENDING area  
✅ **Requirement 2**: VIP Order priority - VIP orders placed before Normal orders but behind other VIP orders  
✅ **Requirement 3**: Unique increasing order numbers - Order IDs increment sequentially  
✅ **Requirement 4**: Bot creation and processing - Bots process orders and move them to COMPLETE  
✅ **Requirement 5**: IDLE bot behavior - Bots wait for new orders when queue is empty  
✅ **Requirement 6**: Bot removal - Newest bot destroyed, order returns to PENDING if processing  
✅ **Requirement 7**: In-memory processing - No data persistence  

## Installation

```bash
# Install dependencies
npm install
```

## Usage

### Run the Simulation
```bash
npm start
# or
node index.js
```

### Run Tests
```bash
npm test
```

### Using Scripts (GitHub Actions Compatible)
```bash
# Build
./scripts/build.sh

# Run tests
./scripts/test.sh

# Execute CLI
./scripts/run.sh
```

The output will be saved to `scripts/result.txt` with timestamps in `HH:MM:SS` format.

## Example Output

```
[14:32:01] McDonald's Order Management System - Simulation Started
[14:32:01] System initialized with 0 bots

[14:32:01] === Creating Initial Orders ===
[14:32:01] Created Normal Order #1001 - Status: PENDING
[14:32:02] Created VIP Order #1002 - Status: PENDING (moved to front)
[14:32:03] Created Normal Order #1003 - Status: PENDING

[14:32:04] === Adding First Bot ===
[14:32:04] Bot #1 created - Status: PROCESSING
[14:32:04] Bot #1 picked up VIP Order #1002 - Status: PROCESSING

[14:32:14] Bot #1 completed VIP Order #1002 - Status: COMPLETE (Processing time: 10s)
...
```

## Key Features

### VIP Priority Queue
- VIP orders are inserted before all Normal orders
- VIP orders maintain their sequence relative to each other
- Implementation uses `findLastIndex` to locate correct insertion point

### Bot Processing
- Each bot processes one order at a time
- 10-second simulated cooking time using `setTimeout`
- Automatic assignment of next order upon completion
- IDLE state when no orders available

### Bot Removal
- Removes newest bot (LIFO - Last In First Out)
- If bot is processing, order returns to PENDING queue
- Clears processing timer to prevent memory leaks

## Testing

The test suite covers:
- ✅ Order creation (Normal and VIP)
- ✅ VIP priority ordering
- ✅ Unique order ID generation
- ✅ Bot addition and removal
- ✅ Order-to-bot assignment
- ✅ 10-second processing time
- ✅ Order completion flow
- ✅ System status reporting

Run tests with:
```bash
npm test
```

## Technical Decisions

### Why Node.js?
- Built-in async handling with `setTimeout` for simulating cooking time
- Easy to implement and test
- Excellent for CLI applications
- Fast development time

### Data Structures
- **Array for order queue**: Simple insertion/removal with O(n) for VIP placement
- **Array for bots**: Easy management and removal by index
- **Array for completed orders**: Maintains history for reporting

### ES Modules
- Using `"type": "module"` in package.json
- Modern JavaScript with import/export
- Better compatibility with Jest

## Development Time

Approximately 30 minutes for core implementation following clean code principles:
- Clear separation of concerns
- Well-documented functions
- Comprehensive test coverage
- Simple and maintainable

## GitHub Actions Workflow

The included workflow (`backend-verify-result.yaml`) will:
1. ✅ Setup Node.js environment
2. ✅ Make scripts executable
3. ✅ Run tests
4. ✅ Build application
5. ✅ Execute CLI
6. ✅ Verify result.txt exists and contains timestamps

## Future Enhancements

Potential improvements (not in scope):
- Configurable processing time
- Multiple order types beyond Normal/VIP
- Bot capacity/performance variations
- Order cancellation
- Real-time event streaming
- Persistent storage option

## License

MIT
