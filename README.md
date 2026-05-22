# McDonald's Order Controller - Documentation

## Overview

This is a Node.js CLI application that implements a McDonald's order management system with automated cooking bots. The system handles order prioritization (VIP orders processed before normal orders), bot management, and order processing with a 10-second processing time per order.

## Architecture

### Core Components

1. **Order Model** (`src/models/order.js`)
   - Represents a customer order (Normal or VIP)
   - Tracks order status (PENDING, PROCESSING, COMPLETE)
   - Manages order lifecycle and timing

2. **Bot Model** (`src/models/bot.js`)
   - Represents a cooking bot that processes orders
   - Handles order processing with 10-second timeout
   - Manages bot state (IDLE, PROCESSING)

3. **OrderController** (`src/orderController.js`)
   - Main controller managing orders and bots
   - Handles bot lifecycle (add/remove)
   - Automatically assigns orders to idle bots
   - Delegates queue management to OrderQueue service

4. **OrderQueue Service** (`src/services/orderQueue.js`)
   - Manages priority queue for pending orders
   - Handles VIP order prioritization logic
   - Encapsulates queue operations (enqueue, dequeue, size, isEmpty)

5. **Constants** (`src/constants.js`)
   - Centralized constants for type safety and maintainability
   - Defines ORDER_TYPES, ORDER_STATUS, BOT_STATUS
   - Configuration values (PROCESSING_TIME_MS, STARTING_ORDER_NUMBER, STARTING_BOT_ID)
   - Eliminates magic strings/numbers throughout codebase

6. **Time Formatter** (`src/utils/timeFormatter.js`)
   - Utility for formatting timestamps in HH:MM:SS format
   - Used for logging and tracking order completion times

7. **CLI Entry Point** (`src/index.js`)
   - Main executable running simulation mode (default for CI/testing)
   
8. **Interactive Mode** (`src/interactive.js`) - Optional
   - Menu-driven interface that can accept user input
   - Can be run with: `npm run interactive` or `node src/interactive.js`

## Key Features

### Order Prioritization
- **VIP Orders**: Processed before all normal orders
- **VIP Queue**: New VIP orders queue behind existing VIP orders
- **Normal Orders**: Processed after all VIP orders, in FIFO order

### Bot Management
- **Add Bot**: Creates a new bot that immediately processes pending orders if available
- **Remove Bot**: Removes the most recently added bot
  - If bot is processing an order, the order is returned to PENDING status
  - The returned order maintains its priority position in the queue

### Order Processing
- Each order takes exactly 10 seconds to process
- Bots process orders sequentially (one at a time)
- When a bot completes an order, it automatically picks up the next pending order
- If no orders are available, bots become IDLE

## Requirements Implementation

✅ **Requirement 1**: New Normal Order shows in PENDING area
- Implemented in `createNormalOrder()`

✅ **Requirement 2**: New VIP Order shows in PENDING area with priority
- Implemented in `createVIPOrder()` with priority insertion logic

✅ **Requirement 3**: Unique, increasing order numbers
- Order numbers start at 1001 and increment sequentially

✅ **Requirement 4**: Bot processes orders from PENDING, moves to COMPLETE after 10 seconds
- Implemented with setTimeout in `Bot.startProcessing()`

✅ **Requirement 5**: Bot becomes IDLE when no orders available
- Automatic state management in `_onOrderCompleted()`

✅ **Requirement 6**: Remove bot returns order to PENDING if processing
- Implemented in `removeBot()` with `bot.stopProcessing()`

✅ **Requirement 7**: No data persistence (in-memory only)
- All data stored in OrderController instance

## Running the Application

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation
```bash
npm install
```

### Build
```bash
./scripts/build.sh
```

### Run Tests
```bash
./scripts/test.sh
```

### Run CLI Application
```bash
./scripts/run.sh
```

The output will be written to `scripts/result.txt` with timestamps in HH:MM:SS format.

### Direct Execution

**Simulation Mode (Default)** - Automated demo for CI/testing:
```bash
node src/index.js
```

**Interactive Mode** - Menu-driven interface for local use (optional):
```bash
npm run interactive
# or
node src/interactive.js
```

The interactive mode provides a menu matching the requirements:
- Create Normal Order (Requirement 1)
- Create VIP Order (Requirement 2)
- Add Bot (Requirement 4)
- Remove Bot (Requirement 6)
- Show Status
- Exit

Simulation mode runs automatically and demonstrates all requirements.
Interactive mode allows you to manually control the system step-by-step.

## Testing

The project includes comprehensive unit tests:

- **Test File**: `test.js`
- **Test Coverage**: 30 tests covering all components
  - **Order Tests**: Order creation, status transitions, VIP checking
  - **Bot Tests**: Bot lifecycle, order processing, error handling
  - **OrderController Tests**: Order prioritization, bot management, queue handling
  - **Time Formatter Tests**: Timestamp formatting
  - **Edge Cases**: Integration scenarios and boundary conditions

The test provides clear console output with pass/fail indicators and a summary.

Run tests with:
```bash
npm test
# or
node test.js
# or
./scripts/test.sh
```

## File Structure

```
.
├── src/
│   ├── models/
│   │   ├── order.js          # Order model
│   │   └── bot.js            # Bot model
│   ├── services/
│   │   └── orderQueue.js     # Priority queue service
│   ├── utils/
│   │   └── timeFormatter.js  # Time formatting utilities
│   ├── constants.js          # Application constants
│   ├── orderController.js    # Main controller
│   ├── index.js              # CLI entry point (simulation mode)
│   └── interactive.js        # Interactive mode (optional)
├── scripts/
│   ├── build.sh             # Build script
│   ├── test.sh               # Test script
│   ├── run.sh                # Run script
│   └── result.txt            # Output file
├── test.js                   # Simple test runner (all tests in one file)
├── package.json
└── README.md
```

## Future Enhancements (Out of Scope)

- Database persistence
- REST API for order management
- WebSocket for real-time updates
- Multiple restaurant support
- Order cancellation
- Bot efficiency metrics

---

## Assignment Requirements

### FeedMe Software Engineer Take Home Assignment

Below is a take home assignment before the interview of the position. You are required to
1. Understand the situation and use case. You may contact the interviewer for further clarification.
2. implement the requirement with **either frontend or backend components**.
3. Complete the requirement with **AI** if possible, but perform your own testing.
4. Provide documentation for the any part that you think is needed.
5. Bring the source code and functioning prototype to the interview session.

### Situation
McDonald is transforming their business during COVID-19. They wish to build the automated cooking bots to reduce workforce and increase their efficiency. As one of the software engineer in the project. You task is to create an order controller which handle the order control flow. 

### User Story
As below is part of the user story:
1. As McDonald's normal customer, after I submitted my order, I wish to see my order flow into "PENDING" area. After the cooking bot process my order, I want to see it flow into to "COMPLETE" area.
2. As McDonald's VIP member, after I submitted my order, I want my order being process first before all order by normal customer.  However if there's existing order from VIP member, my order should queue behind his/her order.
3. As McDonald's manager, I want to increase or decrease number of cooking bot available in my restaurant. When I increase a bot, it should immediately process any pending order. When I decrease a bot, the processing order should remain un-process.
4. As McDonald bot, it can only pickup and process 1 order at a time, each order required 10 seconds to complete process.

### Requirements
1. When "New Normal Order" clicked, a new order should show up "PENDING" Area.
2. When "New VIP Order" clicked, a new order should show up in "PENDING" Area. It should place in-front of all existing "Normal" order but behind of all existing "VIP" order.
3. The order number should be unique and increasing.
4. When "+ Bot" clicked, a bot should be created and start processing the order inside "PENDING" area. after 10 seconds picking up the order, the order should move to "COMPLETE" area. Then the bot should start processing another order if there is any left in "PENDING" area.
5. If there is no more order in the "PENDING" area, the bot should become IDLE until a new order come in.
6. When "- Bot" clicked, the newest bot should be destroyed. If the bot is processing an order, it should also stop the process. The order should return to its original position in the "PENDING" area (maintaining VIP/Normal order priority).
7. No data persistance is needed for this prototype, you may perform all the process inside memory.

### Functioning Prototype
You must implement **either** frontend or backend components as described below:

#### 1. Frontend
- You are free to use **any framework and programming language** of your choice
- The UI application must be compiled, deployed and hosted on any publicly accessible web platform
- Must provide a user interface that demonstrates all the requirements listed above
- Should allow users to interact with the McDonald's order management system

#### 2. Backend
- You must use **either Go (Golang) or Node.js** for the backend implementation
- The backend must be a CLI application that can be executed in GitHub Actions
- Must implement the following scripts in the `script` directory:
  - `test.sh`: Contains unit test execution steps
  - `build.sh`: Contains compilation steps for the CLI application
  - `run.sh`: Contains execution steps that run the CLI application
- The CLI application result must be printed to `result.txt`
- The `result.txt` output must include timestamps in `HH:MM:SS` format to track order completion times
- Must follow **GitHub Flow**: Create a Pull Request with your changes to this repository
- Ensure all GitHub Action checks pass successfully
- **Note**: An interactive CLI implementation is compulsory for the next round of interview. Candidates should be prepared to demonstrate interactive command handling.

#### Submission Requirements
- Fork this repository and implement your solution with either frontend or backend
- **Frontend option**: Deploy to a publicly accessible URL using any technology stack
- **Backend option**: Must be implemented in Go or Node.js and work within the GitHub Actions environment
  - Follow GitHub Flow process with Pull Request submission
  - All tests in `test.sh` must pass
  - The `result.txt` file must contain meaningful output from your CLI application
  - All output must include timestamps in `HH:MM:SS` format to track order completion times
  - Submit a Pull Request and ensure the `backend-verify-result` workflow passes
- Provide documentation for any part that you think is needed

### Tips on completing this task
- Testing, testing and testing. Make sure the prototype is functioning and meeting all the requirements.
- Utilize coding agent to complete the assignment scope your working hour within 1 hour, do not over engineer it. However, ensure you read and understand what your code doing and apply good engineering practice.
- Complete the implementation as clean as possible, clean code is a strong plus point, do not bring in all the fancy tech stuff.
