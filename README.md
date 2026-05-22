# McDonald's Order Management System

A backend implementation of an automated order management system for McDonald's cooking bots, built with NestJS and Node.js.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [How It Works](#how-it-works)
- [Testing](#testing)
- [Original Assignment](#original-assignment)

## 🎯 Overview

This is a backend API implementation that simulates McDonald's automated cooking bot system. The system manages:

- **Normal and VIP orders** with priority queue processing
- **Multiple cooking bots** that can be dynamically added or removed
- **Order lifecycle management** (PENDING → PROCESSING → COMPLETE)
- **Automatic bot assignment** to pending orders
- **10-second order processing time** per bot

## 🏗️ Architecture

The application follows a modular architecture using NestJS:

```
src/
├── bot/                    # Bot management module
│   ├── bot.controller.ts   # REST endpoints for bot operations
│   ├── bot.service.ts      # Bot business logic
│   ├── bot-processor.service.ts  # Bot order processing logic
│   ├── bot.repository.ts   # In-memory bot storage
│   └── entities/           # Bot entity definitions
├── order/                  # Order management module
│   ├── order.controller.ts # REST endpoints for order operations
│   ├── order.service.ts    # Order business logic
│   ├── order.repository.ts # In-memory order storage
│   └── entities/           # Order entity definitions
├── queue/                  # Queue management module
│   └── queue.service.ts    # Priority queue for VIP/Normal orders
├── logger/                 # Logging module
│   └── logger.service.ts   # Custom logger with timestamp formatting
└── main.ts                 # Application entry point
```

### Key Components:

1. **Bot Module**: Manages cooking bot lifecycle and state (IDLE/PROCESSING)
2. **Order Module**: Handles order creation and status tracking
3. **Queue Module**: Implements priority queue (VIP orders first, then Normal orders)
4. **Bot Processor**: Coordinates bot-order assignment and processing
5. **Logger**: Provides timestamped logs in HH:MM:SS format

## 💻 Installation

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Install Dependencies

```bash
npm install
```

## 🚀 Running the Application

### Development Mode (with hot-reload)

```bash
npm run start:dev
```

The server will start on `http://localhost:3000`

### Production Mode

```bash
# Build the application
npm run build

# Start the application
npm run start:prod
```

### Using Build Scripts

```bash
# Build
./scripts/build.sh

# Run (output to result.txt)
./scripts/run.sh

# Test
./scripts/test.sh
```

## 📡 API Documentation

All endpoints are prefixed with `/api`

### Bot Endpoints

#### Create a Bot

```
POST /api/bot
```

**Description**: Creates a new cooking bot and immediately starts processing pending orders

**Response**:

```json
{
  "id": 1,
  "status": "IDLE"
}
```

#### Remove a Bot

```
DELETE /api/bot
```

**Description**: Removes the most recently created bot. If the bot is processing an order, the order returns to PENDING status.

**Response**:

```json
{
  "id": 1,
  "status": "IDLE"
}
```

#### Get All Bots

```
GET /api/bot
```

**Description**: Returns all bots and their current status

**Response**:

```json
{
  "bots": [
    {
      "id": 1,
      "status": "PROCESSING",
      "currentOrderId": 1
    }
  ],
  "count": 1
}
```

### Order Endpoints

#### Create Normal Order

```
POST /api/order/normal
```

**Description**: Creates a new normal customer order with PENDING status

**Response**:

```json
{
  "id": 1,
  "type": "Normal",
  "status": "PROCESSING",
  "createdAt": "2025-10-27T04:03:02.636Z",
  "botId": 1
}
```

#### Create VIP Order

```
POST /api/order/vip
```

**Description**: Creates a new VIP order. VIP orders are processed before normal orders.

**Response**:

```json
{
  "id": 2,
  "type": "VIP",
  "status": "PENDING",
  "createdAt": "2025-10-27T04:04:32.150Z"
}
```

#### Get All Orders

```
GET /api/order
```

**Description**: Returns all orders with their current status

**Response**:

```json
{
  "orders": [
    {
      "id": 1,
      "type": "Normal",
      "status": "PENDING",
      "createdAt": "2025-10-27T04:03:02.636Z"
    },
    {
      "id": 2,
      "type": "VIP",
      "status": "PENDING",
      "createdAt": "2025-10-27T04:04:32.150Z"
    }
  ],
  "count": 2
}
```

#### Get Order by ID

```
GET /api/order/:id
```

**Description**: Returns a specific order by ID

**Response**:

```json
{
  "id": 2,
  "type": "VIP",
  "status": "PENDING",
  "createdAt": "2025-10-27T04:04:32.150Z"
}
```

## 🔧 How It Works

### Order Processing Flow

1. **Order Creation**:
   - When a normal or VIP order is created via API
   - Order is assigned a unique incremental ID
   - Order status is set to PENDING
   - Order is added to the priority queue

2. **Queue Priority**:
   - The queue maintains two separate queues internally:
     - VIP Queue (higher priority)
     - Normal Queue (lower priority)
   - When dequeuing, VIP orders are always processed first
   - Orders within the same priority level are processed FIFO

3. **Bot Assignment**:
   - When a bot is created or becomes idle:
     - Bot subscribes to queue notifications
     - Bot attempts to pick up an order from the queue
     - If an order exists, bot status changes to PROCESSING
     - Order status changes to PROCESSING

4. **Order Processing**:
   - Each order takes exactly 10 seconds to complete
   - Bot holds reference to the current order ID
   - After 10 seconds:
     - Order status changes to COMPLETE
     - Bot status changes to IDLE
     - Bot automatically picks up the next pending order

5. **Bot Removal**:
   - When a bot is removed (always the most recent bot):
     - Bot unsubscribes from queue notifications
     - If bot is processing an order:
       - Processing is stopped
       - Order is returned to the front of the queue (maintaining priority)
       - Order status reverts to PENDING

### Key Features

- **Event-Driven Architecture**: Bots subscribe to queue events and automatically process orders when available
- **Priority Queue**: Ensures VIP orders are always processed before normal orders
- **Graceful Shutdown**: On application shutdown, all bots are cleaned up properly
- **In-Memory Storage**: No database required - all data stored in memory (as per requirements)
- **Timestamped Logging**: All actions are logged with HH:MM:SS timestamps

## 🧪 Testing

### Run Unit Tests

```bash
npm run test
```

### Run E2E Tests

```bash
npm run test:e2e
```

### Run Tests with Coverage

```bash
npm run test:cov
```

## 📊 Example Usage Scenario

```bash
# 1. Start the server
npm run start:dev

# 2. Create a bot
curl -X POST http://localhost:3000/api/bot

# 3. Create some orders
curl -X POST http://localhost:3000/api/order/normal
curl -X POST http://localhost:3000/api/order/vip
curl -X POST http://localhost:3000/api/order/normal

# 4. Check bot status
curl http://localhost:3000/api/bot

# 5. Check order status
curl http://localhost:3000/api/order

# 6. Add another bot to process orders faster
curl -X POST http://localhost:3000/api/bot

# 7. Wait 10 seconds and check orders again
curl http://localhost:3000/api/order

# 8. Remove a bot
curl -X DELETE http://localhost:3000/api/bot
```

## 📝 Console Output Example

When running the application, you'll see timestamped logs:

```
McDonald's Order Management System - Simulation Results

[12:00:00] System initialized with 0 bots
[12:00:05] Bot #1 created - Status: IDLE
[12:00:06] Created Normal Order #1 - Status: PENDING
[12:00:06] Bot #1 picked up Normal Order #1 - Status: PROCESSING
[12:00:16] Bot #1 completed Normal Order #1 - Status: COMPLETE (Processing time: 10s)
[12:00:16] Bot #1 is now IDLE - No pending orders
[12:00:20] Created VIP Order #2 - Status: PENDING
[12:00:20] Bot #1 picked up VIP Order #2 - Status: PROCESSING
[12:00:30] Bot #1 completed VIP Order #2 - Status: COMPLETE (Processing time: 10s)
```

---

## 📋 Original Assignment

<details>
<summary>Click to view the original assignment requirements</summary>

### Situation

McDonald is transforming their business during COVID-19. They wish to build the automated cooking bots to reduce workforce and increase their efficiency. As one of the software engineer in the project. You task is to create an order controller which handle the order control flow.

### User Story

As below is part of the user story:

1. As McDonald's normal customer, after I submitted my order, I wish to see my order flow into "PENDING" area. After the cooking bot process my order, I want to see it flow into to "COMPLETE" area.
2. As McDonald's VIP member, after I submitted my order, I want my order being process first before all order by normal customer. However if there's existing order from VIP member, my order should queue behind his/her order.
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
</details>
