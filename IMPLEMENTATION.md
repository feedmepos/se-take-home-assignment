# McDonald's Order Management System

A Node.js CLI application that simulates McDonald's automated order management system with cooking bots, implementing priority queues for VIP vs Normal customers.

## Features

- **Order Management**: Supports Normal and VIP order types with proper priority handling
- **Bot System**: Dynamic bot creation/removal with automatic order processing
- **Priority Queue**: VIP orders are processed before Normal orders, maintaining FIFO within each priority level
- **Real-time Processing**: Each bot processes orders for 10 seconds (configurable)
- **Status Monitoring**: Comprehensive status reporting of bots, pending orders, and completed orders

## Architecture

### Core Classes

#### `Order`
Represents a customer order with:
- Unique ID (auto-incrementing)
- Type: `NORMAL` or `VIP`
- Status: `PENDING` or `COMPLETE`
- Creation timestamp

#### `Bot`
Represents a cooking bot with:
- Unique ID
- Status: `IDLE` or `PROCESSING`
- Current order assignment
- 10-second processing timer

#### `OrderController`
Main system controller that:
- Manages order queues with VIP priority
- Handles bot lifecycle (creation/removal)
- Orchestrates order-to-bot assignment
- Provides system status reporting

## Priority Logic

1. **VIP Orders**: Always placed ahead of Normal orders
2. **FIFO Within Priority**: Multiple VIP orders maintain first-in-first-out ordering
3. **Dynamic Insertion**: New VIP orders insert after existing VIPs but before any Normal orders

## Usage

### Running the Application

```bash
# Build the application
./scripts/build.sh

# Run unit tests
./scripts/test.sh

# Execute the demo
./scripts/run.sh
```

The demo output is saved to `scripts/result.txt`.

### API Examples

```javascript
const { OrderController } = require('./order-controller');

const controller = new OrderController();

// Add orders
controller.addNormalOrder();  // Returns Order object
controller.addVipOrder();     // Returns Order object (goes to front)

// Manage bots
controller.addBot();          // Returns Bot object, starts processing
controller.removeBot();       // Removes newest bot, returns interrupted order to queue

// Check status
controller.printStatus();     // Prints formatted status
const status = controller.getStatus(); // Returns status object
```

## Requirements Implementation

✅ **Requirement 1**: New Normal Order creates order in PENDING area  
✅ **Requirement 2**: New VIP Order prioritized ahead of Normal orders  
✅ **Requirement 3**: Unique, incrementing order numbers  
✅ **Requirement 4**: Bot creation triggers immediate order processing  
✅ **Requirement 5**: Bots become IDLE when no orders available  
✅ **Requirement 6**: Bot removal stops current processing, returns order to queue  
✅ **Requirement 7**: In-memory processing (no persistence)

## Testing

The application includes comprehensive unit tests covering:
- Order and bot creation
- Priority queue management
- Bot processing lifecycle
- System state management

Run tests with:
```bash
npm test
# or
./scripts/test.sh
```

## Demo Scenario

The included demo demonstrates:
1. Bot creation and initial status
2. Normal order processing
3. VIP order priority insertion
4. Multiple VIP order ordering
5. Multi-bot parallel processing
6. Dynamic bot scaling
7. Bot removal with order recovery
8. Complete order lifecycle

## File Structure

```
├── index.js              # Main CLI application with demo
├── order-controller.js   # Core system implementation  
├── test.js              # Unit test suite
├── package.json         # Node.js project configuration
└── scripts/
    ├── build.sh         # Build script
    ├── test.sh          # Test execution script
    ├── run.sh           # Application execution script
    └── result.txt       # Demo output file
```

## Technical Details

- **Language**: Node.js (JavaScript)
- **Dependencies**: None (vanilla Node.js)
- **Processing Time**: 10 seconds per order (simulated with setTimeout)
- **Queue Management**: Array-based with splice operations for priority insertion
- **Concurrency**: Event-driven with setTimeout for asynchronous processing